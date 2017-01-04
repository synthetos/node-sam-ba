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
RUN arm-none-eabi-g++ -O0 -g0 -mcpu=cortex-m3 -mthumb -std=gnu++14 -fno-rtti -fno-exceptions -xc++ -nostartfiles -Tsam3x8a-sram.ld flasher.cpp -o flasher-sam3x.so

RUN arm-none-eabi-objdump -C -d flasher-sam3x.so
RUN arm-none-eabi-nm -C -g flasher-sam3x.so
RUN arm-none-eabi-readelf -a flasher-sam3x.so
#RUN arm-none-eabi-nm -C -g flasher-sam3x.o | awk '{if (!match($3,/^_/)) {sub(/\(\)/,"",$3); print "\""$3"\": 0x"$1","}}'
#RUN arm-none-eabi-objcopy -O binary flasher-sam3x.so flasher-sam3x.bin
RUN ./make_js.sh flasher-sam3x

# make the sams70 flasher blob
RUN arm-none-eabi-g++ -O0 -g0 -mcpu=cortex-m7 -mthumb -std=gnu++14 -fno-rtti -fno-exceptions -xc++ -nostartfiles -Tsams70n19-sram.ld -DBLOCK_SIZE=512 flasher.cpp -o flasher-sams70.so
RUN arm-none-eabi-objdump -C -d flasher-sams70.so
RUN arm-none-eabi-nm -C -g flasher-sams70.so
RUN arm-none-eabi-readelf -a flasher-sams70.so
RUN ./make_js.sh flasher-sams70
