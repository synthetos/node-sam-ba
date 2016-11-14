#include <cstdint>

#ifndef IAP_FUNC_ADDR
#define IAP_FUNC_ADDR 0
#endif

volatile uint32_t jump_address __attribute__ ((used));
volatile uint32_t stack_address __attribute__ ((used));
uint32_t inited;

typedef uint32_t(*IAP_Function_t)(uint32_t, uint32_t);
IAP_Function_t IAP_Function;

#if !(defined(__ASSEMBLY__) || defined(__IAR_SYSTEMS_ASM__))
#include <stdint.h>
#ifndef __cplusplus
typedef volatile const uint32_t RoReg; /**< Read only 32-bit register (volatile const unsigned int) */
#else
typedef volatile       uint32_t RoReg; /**< Read only 32-bit register (volatile const unsigned int) */
#endif
typedef volatile       uint32_t WoReg; /**< Write only 32-bit register (volatile unsigned int) */
typedef volatile       uint32_t RwReg; /**< Read-Write 32-bit register (volatile unsigned int) */
#endif

struct Efc {
  RwReg EEFC_FMR; /**< \brief (Efc Offset: 0x00) EEFC Flash Mode Register */
  WoReg EEFC_FCR; /**< \brief (Efc Offset: 0x04) EEFC Flash Command Register */
  RoReg EEFC_FSR; /**< \brief (Efc Offset: 0x08) EEFC Flash Status Register */
  RoReg EEFC_FRR; /**< \brief (Efc Offset: 0x0C) EEFC Flash Result Register */
};

#define   EEFC_FCR_FCMD_GETD (0x0u << 0) /**< \brief (EEFC_FCR) Get Flash descriptor */
#define   EEFC_FCR_FCMD_EWP (0x3u << 0) /**< \brief (EEFC_FCR) Erase page and write page */

#define EFC0       ((Efc    *)0x400E0A00U) /**< \brief (EFC0      ) Base Address */
#define EFC1       ((Efc    *)0x400E0C00U) /**< \brief (EFC1      ) Base Address */

volatile uint32_t flashPage = 0; //
volatile uint32_t flashStatus = 0;
volatile uint32_t EFCIndex = 0; // 0:EEFC0, 1: EEFC1

struct EEFCPlaneInfo {
    uint32_t SIZE;
};

struct EEFCFlashDescriptor {
    uint32_t FL_ID;
    uint32_t FL_SIZE;
    uint32_t FL_PAGE_SIZE;
    uint32_t FL_NB_PLANE;
    EEFCPlaneInfo FL_PLANE[3];
};

EEFCFlashDescriptor flashDescriptor;

void flashInit(void) __attribute__ ((used));
void flashInit() {
    /* Initialize the function pointer (retrieve function address from NMI vector) */
    IAP_Function = (IAP_Function_t)*((uint32_t*)IAP_FUNC_ADDR);

    EFC0->EEFC_FMR = 0x6 << 8;
    EFC1->EEFC_FMR = 0x6 << 8;
    inited = 0xBEEF;

    // MUST be called before returning
    register uint32_t r0 asm ("r0");
    r0 = stack_address;
}

void readFlashInfo(void) __attribute__ ((used));
void readFlashInfo(void)
{
    uint32_t flash_cmd = 0;

    /* Send your data to the sector here */
    /* build the command to send to EEFC */
    flash_cmd = (0x5A << 24) | EEFC_FCR_FCMD_GETD;

    /* Call the IAP function with appropriate command */
    flashStatus = IAP_Function(EFCIndex, flash_cmd);

    uint32_t *read = (uint32_t*)&flashDescriptor;

    if (EFCIndex == 0) {
        *read++ = EFC0->EEFC_FRR;
        *read++ = EFC0->EEFC_FRR;
        *read++ = EFC0->EEFC_FRR;
        *read++ = EFC0->EEFC_FRR;
        *read++ = EFC0->EEFC_FRR;
    } else {
        *read++ = EFC1->EEFC_FRR;
        *read++ = EFC1->EEFC_FRR;
        *read++ = EFC1->EEFC_FRR;
        *read++ = EFC1->EEFC_FRR;
        *read++ = EFC1->EEFC_FRR;
    }

    // MUST be called before returning
    register uint32_t r0 asm ("r0");
    r0 = stack_address;
}
