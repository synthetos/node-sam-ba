#include <cstdint>

#ifndef BLOCK_SIZE
#define BLOCK_SIZE 256
#endif

alignas(4) volatile uint32_t jump_address __attribute__ ((used));
alignas(4) volatile uint32_t stack_address __attribute__ ((used));

volatile uint32_t *copyFromPtr = 0;
volatile uint32_t *copyToPtr = 0;
volatile uint32_t copyLength = 0;

alignas(4) volatile uint8_t buffer0[BLOCK_SIZE];
alignas(4) volatile uint8_t buffer1[BLOCK_SIZE];

uint32_t copyToFlash(void) __attribute__ ((used));
uint32_t copyToFlash() {
    uint32_t *localCopyFromPtr = (uint32_t *)copyFromPtr;
    uint32_t *localCopyToPtr = (uint32_t *)copyToPtr;

    for (int32_t i = copyLength; i>0; i-=4) {
        *localCopyToPtr++ = *localCopyFromPtr++;
    }

    return stack_address;
}
