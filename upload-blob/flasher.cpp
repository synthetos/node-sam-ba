#include <cstdint>

#define   EEFC_FCR_FCMD_EWP (0x3u << 0) /**< \brief (EEFC_FCR) Erase page and write page */

uint32_t FlashSectorNum = 200; //
uint32_t flash_status = 0;
uint32_t EFCIndex = 0; // 0:EEFC0, 1: EEFC1

void flash(void) __attribute__ ((used));
void flash(void)
{
    uint32_t flash_cmd = 0;

    /* Initialize the function pointer (retrieve function address from NMI vector) */
    uint32_t (*IAP_Function)(uint32_t, uint32_t);
    IAP_Function = (uint32_t (*)(uint32_t, uint32_t))IAP_FUNC_ADDR;

    /* Send your data to the sector here */
    /* build the command to send to EEFC */
    flash_cmd = (0x5A << 24) | (FlashSectorNum << 8) | EEFC_FCR_FCMD_EWP;

    /* Call the IAP function with appropriate command */
    flash_status = IAP_Function(EFCIndex, flash_cmd);
}
