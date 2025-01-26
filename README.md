# Battle of the Bandwidth

A modern web application for tracking and monitoring maximum network bandwidth. 

The application runs a speed test on a set interval and stores the result. The results are then displayed on a filtered chart to provide a quick overview of network performance.

 Built with:
- React web interface
- Go API server
- Postgres database
- Containerized deployment

### Showcase

![showcase-screenshot-01.png](showcase-screenshot-01.png)

### Project Structure

- `frontend/` - React-based web interface, utilizing Next.js
- `backend/` - API server written in Go with a Postgres database
- `docker-compose.yml` - Docker Compose configuration for easy container deployment

## Installation

### Using Docker

```bash
# Clone the repository
git clone https://github.com/phillipshreves/battle-of-the-bandwidth.git

# Change directories
cd battle-of-the-bandwidth

# Start the application using Docker Compose
docker compose up
```

## How to use

You can visit http://localhost:40080/ to view the web application. You will not have any starting data, so do not be alarmed by the empty chart. The application performs a single speed test on startup, but you can also run one manually via settings at the bottom of the page.

You can set the time between tests in the settings as well, the default is 1 day.

Filters are available above the chart to allow for a more precise data view.

## Roadmap

- Add Cloudflare speed test as a provider
- Add provider filter
 
## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## Acknowledgements

This application utilizes [CloudFlare](https://github.com/cloudflare/speedtest?tab=readme-ov-file) and the [LibreSpeed](https://librespeed.org/) project to perform speed tests. Please visit their sponsors to support the project.
