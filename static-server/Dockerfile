########################################################################
#	Static Server
#   API Service 
########################################################################

#### Stage BASE ########################################################
FROM node:14-alpine AS BASE

# Install base packages, create data dir
RUN set -ex && \
    apk add --no-cache \
        bash \
        tzdata \
        iputils \
        linux-headers \
        udev \
        openssl

# Copy app packages
WORKDIR /usr/src/app/
COPY ./app/ .

#### Stage BUILD #######################################################
FROM BASE AS BUILD

RUN apk add --no-cache --virtual buildtools \
                        ca-certificates \
                        curl \
                        openssh-client \
                        build-base 

# Install App Packages
WORKDIR /usr/src/app/
RUN npm install

# Generate HTTPS certs
WORKDIR /tmp/certs
RUN openssl req -new -newkey rsa:4096 -days 9999 -nodes -x509 \
    -subj "/C=IT/ST=Milan/L=Milan/O=Siemens Spa/CN=postgres-static-server" \
    -keyout server.key  -out server.cert

#### Stage RELEASE #######################################################################################################
FROM BASE AS RELEASE

RUN export BUILD_DATE=$(date +"%Y-%m-%dT%H:%M:%SZ")
USER root


WORKDIR /usr/src/app/
# copy builded apps from BUILD
COPY --from=BUILD /usr/src/app/ ./
# copy generated certs from BUILD
COPY --from=BUILD /tmp/certs ./certs


CMD ["node", "/usr/src/app/main.js"]
#ENTRYPOINT ["tail", "-f" , "/dev/null"]

