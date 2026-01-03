# Battle of the Bandwidth

A modern web application for tracking and monitoring network performance. 

The application runs speed tests utilizing cron schedules and stores the result. The results are then displayed on a filtered chart to provide a quick overview of network performance.

### Showcase

I've recorded a video walkthrough, viewable here: [https://youtu.be/X-d04KZH0_I](https://youtu.be/X-d04KZH0_I)

![showcase-screenshot-01.png](showcase-screenshot-01.png)

### Architecture

The application consists of four main components:
- **React Frontend**: Web application that provides a simple user interface
- **Go Backend**: Primary API server that handles speed tests and data storage
- **Node.js Backend**: Complementary service providing additional functionality through provider packages(Cloudflare)
- **Postgres Database**: Persists speed test data

All containerized for your deployment pleasure. An example docker-compose.yml file is provided, but be sure to edit it for your needs.

### File Structure

- `frontend/` - React-based web interface, utilizing Next.js
- `backend/` - Go API server
- `backend-node/` - Node.js API server, utilizing NestJS
- `docker-compose.yml` - Docker Compose configuration for easy container deployment
- `.env` - Provides timezone control

## Installation

### Using Docker Compose

#### Prebuilt Images

I've prebuilt multiple architecture images and pushed to Docker Hub. You can simply setup a docker-compose.yml file to download and run these images.

Copy the [docker-compose.yml](docker-compose.yml) file in this repository to your local computer, then from the same directory, run:

```bash
docker compose up -d
```

#### Build Images

If you'd like to build the docker images yourself:

```bash
# Clone the repository
git clone https://github.com/phillipshreves/battle-of-the-bandwidth.git

# Navigate to project directory
cd battle-of-the-bandwidth

# Build and start the application using Docker Compose
docker compose up -d --build
```

## Usage

Access the web application at http://localhost:40080/

**Note:** The chart will appear empty until speed tests have been run.

### Running Speed Tests

- **Manual Test:** Click the "Run Now" button on a schedule
- **Scheduled Tests:** Configure automated tests using the "Add Schedule" button

### Data Analysis

Use the filters above the chart to refine the displayed results.

### Schedule Management

The Schedules table displays your configured automated tests:

- **Name:** Identifier for the schedule
- **Schedule:** Cron expression defining the test frequency
- **Provider:** Speed test service being used
- **Status:** Active (will run at scheduled times) or Inactive (disabled)
- **Last Run:** Timestamp of most recent execution
- **Result Limit:** Maximum number of results to keep for this schedule (0 means no limit)

#### Schedule Controls

- **Run Now**: Click "Run Now" to start the speed test using the schedule's provider setup
- **Create**: Click "Add Schedule" to create a new scheduled test
- **Edit**: Click the edit icon on any schedule row to modify its settings
- **Delete**: Click the delete icon to remove a schedule
- **Enable/Disable**: Toggle the status switch to pause or resume a schedule without deleting it

#### Cron Expressions:
Schedules use standard cron syntax (e.g., `0 */6 * * *` for every 6 hours). The application supports:
- Minute-level granularity
- Day-of-week specifications
- Range expressions
- Step values

The cron service utilized [robfig's cron package](https://github.com/robfig/cron). Confirm support of cron functionality by visiting the project.

### Time Zone Management

In the filters section, you can toggle chart data to display in server time or local client time.

Setting the server time zone is important as your cron schedules run based on this time zone. Best practice is to leave it as UTC, however, if you find it easier to manage in your local time zone, following the instructions below to change it.

To modify the timezone for all containers, create a .env file with a `TZ` and a `CRON_TZ` variables. Set the variables equal to the [tz identifier](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for the time zone of your preference. Default tz identifier is Etc/UTC.

Example .env file:
```
TZ=Etc/UTC
CRON_TZ=Etc/UTC
```

## Providers

Three providers are currently supported:
- Librespeed
- Cloudflare
- iperf3

All three providers have public servers you can run speed tests against.

The biggest advantage of the iperf3 provider is that it can be used for internal testing. This allows you to track infrastructure changes and their effect on your network speed.

## How to Release for Maintainers

Release is made easy by utilizing Docker Hub. Follow these steps issue a release:

1. Update docker compose file with appropriate version numbering for docker image tag.
2. Update respective package.json files if necessary
3. Run the following command to build and push to Docker Hub: `docker buildx bake --push`
4. Create release notes on Github

## Acknowledgements

This application utilizes [CloudFlare](https://github.com/cloudflare/speedtest?tab=readme-ov-file), [iperf3](https://iperf.fr/), and the [LibreSpeed](https://librespeed.org/) project to perform speed tests. Please visit their sponsors to support the project.
