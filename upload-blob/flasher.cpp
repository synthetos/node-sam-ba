#include <cstdint>

#ifndef IAP_FUNC_ADDR
#define IAP_FUNC_ADDR 0
#endif

volatile uint32_t jump_address __attribute__ ((used));
volatile uint32_t stack_address __attribute__ ((used));

volatile uint32_t *copyFromPtr = 0;
volatile uint32_t *copyToPtr = 0;
volatile uint32_t copyLength = 0;

alignas(4) volatile uint8_t buffer0[256];
alignas(4) volatile uint8_t buffer1[256];

uint32_t copyToFlash(void) __attribute__ ((used));
uint32_t copyToFlash() {
    uint32_t *localCopyFromPtr = (uint32_t *)copyFromPtr;
    uint32_t *localCopyToPtr = (uint32_t *)copyToPtr;

    for (int32_t i = copyLength; i>0; i-=4) {
        *localCopyToPtr++ = *localCopyFromPtr++;
    }

    return stack_address;
}
