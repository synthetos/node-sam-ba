#include <cstdint>

#ifndef IAP_FUNC_ADDR
#define IAP_FUNC_ADDR 0
#endif

volatile uint32_t jump_address __attribute__ ((used));
volatile uint32_t stack_address __attribute__ ((used));
volatile uint32_t inited;

volatile uint32_t *copyFromPtr = 0;
volatile uint32_t *copyToPtr = 0;
volatile uint32_t copyLength = 0;

alignas(4) volatile uint8_t buffer0[256];
alignas(4) volatile uint8_t buffer1[256];

uint32_t copyToFlash(void) __attribute__ ((used));
uint32_t copyToFlash() {
    for (uint32_t i = copyLength/4; i>0; i--) {
        *copyFromPtr++ = *copyToPtr++;
    }

    return stack_address;
}
