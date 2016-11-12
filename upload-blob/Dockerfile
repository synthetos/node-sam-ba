FROM ubuntu:latest
RUN apt-get update && \
  apt-get install -y build-essential unzip git lib32z1 curl ca-certificates --no-install-recommends

WORKDIR /tools
RUN curl -OL https://launchpad.net/gcc-arm-embedded/5.0/5-2016-q3-update/+download/gcc-arm-none-eabi-5_4-2016q3-20160926-linux.tar.bz2
RUN tar xjf gcc-arm-none-eabi-5_4-2016q3-20160926-linux.tar.bz2

ADD . /code
WORKDIR /code

ENV PATH /tools/gcc-arm-none-eabi-5_4-2016q3/bin:"${PATH}"

# make the sam3x flasher blob
RUN arm-none-eabi-g++ -mcpu=cortex-m4 -mthumb -ffunction-sections -fdata-sections -std=gnu++14 -fno-rtti -fno-exceptions -xc++ -DIAP_FUNC_ADDR=0x00100008 -Wl,--cref -Wl,--check-sections -nostartfiles -Tsam3x8a-sram.ld flasher.cpp -o flasher-sam3x.o

#RUN arm-none-eabi-objdump -C -d flasher-sam3x.o
#RUN arm-none-eabi-nm -C -g flasher-sam3x.o
#RUN arm-none-eabi-nm -C -g flasher-sam3x.o | awk '{if (!match($3,/^_/)) {sub(/\(\)/,"",$3); print "\""$3"\": 0x"$1","}}'
#RUN arm-none-eabi-objcopy -O binary flasher-sam3x.o flasher-sam3x.bin
RUN ./make_js.sh flasher-sam3x

RUN arm-none-eabi-g++ -mcpu=cortex-m4 -mthumb -ffunction-sections -fdata-sections -std=gnu++14 -fno-rtti -fno-exceptions -xc++  -DIAP_FUNC_ADDR=0x00800008 -Wl,--cref -Wl,--check-sections -nostartfiles -Tsams70n19-sram.ld flasher.cpp -o flasher-sams70.o

#RUN arm-none-eabi-objdump -C -d flasher-sams70.o
#RUN arm-none-eabi-nm -C -g flasher-sams70.o
#RUN arm-none-eabi-objcopy -O binary flasher-sams70.o flasher-sams70.bin
#RUN arm-none-eabi-nm -C -g flasher-sams70.o | awk '{if (!match($3,/^_/)) {sub(/\(\)/,"",$3); print "\""$3"\": 0x"$1","}}'
RUN ./make_js.sh flasher-sams70
