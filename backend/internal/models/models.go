package models

import "time"

type SpeedTestResult struct {
        Timestamp string `json:"timestamp"`
        Server    struct {
                Name string `json:"name"`
                URL  string `json:"url"`
        } `json:"server"`
        Client struct {
                IP       string `json:"ip"`
                Hostname string `json:"hostname"`
                City     string `json:"city"`
                Region   string `json:"region"`
                Country  string `json:"country"`
                Loc      string `json:"loc"`
                Org      string `json:"org"`
                Postal   string `json:"postal"`
                Timezone string `json:"timezone"`
        } `json:"client"`
        BytesSent     int64   `json:"bytes_sent"`
        BytesReceived int64   `json:"bytes_received"`
        Ping          float64 `json:"ping"`
        Jitter        float64 `json:"jitter"`
        Upload        float64 `json:"upload"`
        Download      float64 `json:"download"`
        Share         string  `json:"share"`
}

type UserSettings struct {
        ID                 string    `json:"id"`
        SpeedtestFrequency int32     `json:"speedtest_frequency"`
        CreatedAt          time.Time `json:"created_at"`
        UpdatedAt          time.Time `json:"updated_at"`
}