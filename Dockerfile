# Use an official Node.js image as the base
FROM node:22

# Install Python and required build tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Stamped by CI so the running bot can say what shipped. Empty in a
# hand-built image, which is fine — nothing depends on them.
ARG APP_COMMIT=""
ARG APP_COMMIT_MESSAGE=""
ENV APP_COMMIT=$APP_COMMIT
ENV APP_COMMIT_MESSAGE=$APP_COMMIT_MESSAGE

# Run the application
CMD ["node", "src/index.js"]