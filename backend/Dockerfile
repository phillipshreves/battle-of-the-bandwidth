# Dockerfile
FROM golang:bookworm

# Set up working directory
WORKDIR /app

# Get speedtest CLI
RUN wget https://github.com/librespeed/speedtest-cli/releases/download/v1.0.11/librespeed-cli_1.0.11_linux_amd64.tar.gz -O /home/librespeed-cli_1.0.11_linux_amd64.tar.gz
RUN tar -xvzf /home/librespeed-cli_1.0.11_linux_amd64.tar.gz -C /home/
RUN chmod +x /home/librespeed-cli_1.0.11_linux_amd64.tar.gz
RUN mv /home/librespeed-cli /usr/local/bin/librespeed-cli

# Copy go.mod and go.sum files for dependency installation
COPY go.mod go.sum ./

# Install dependencies
RUN go mod download

# Copy the rest of the application code
COPY .. .

# Clean up dependencies
RUN go mod tidy

# Build the Go application
RUN go build -o botb-backend ./cmd

# Expose the app's port
EXPOSE 8080

# Start the application
CMD ["./botb-backend"]
