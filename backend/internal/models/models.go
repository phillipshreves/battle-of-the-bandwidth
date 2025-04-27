package models

import (
	"fmt"
	"strings"
	"time"
)

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
	ProviderID    string  `json:"provider_id"`
	ProviderName  string  `json:"provider_name"`
}

type UserSettings struct {
	ID                 string    `json:"id"`
	SpeedtestFrequency int32     `json:"speedtest_frequency"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type DefaultJsonResponse struct {
	Data  string `json:"data"`
	Error string `json:"error"`
}

type Schedule struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	CronExpression string    `json:"cron_expression"`
	ProviderID     string    `json:"provider_id"`
	ProviderName   string    `json:"provider_name"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	HostEndpoint   string    `json:"host_endpoint"`
	HostPort       string    `json:"host_port"`
}

type Provider struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SpeedTestRequest struct {
	Providers    []string `json:"providers"`
	HostEndpoint string   `json:"hostEndpoint"`
	HostPort     string   `json:"hostPort"`
}

// Iperf3Result represents the JSON output from iperf3 command
type Iperf3Result struct {
	Start struct {
		Connected []struct {
			Socket     int    `json:"socket"`
			LocalHost  string `json:"local_host"`
			LocalPort  int    `json:"local_port"`
			RemoteHost string `json:"remote_host"`
			RemotePort int    `json:"remote_port"`
		} `json:"connected"`
		Version    string `json:"version"`
		SystemInfo string `json:"system_info"`
		Timestamp  struct {
			Time     string `json:"time"`
			TimeSecs int64  `json:"timesecs"`
		} `json:"timestamp"`
		ConnectingTo struct {
			Host string `json:"host"`
			Port int    `json:"port"`
		} `json:"connecting_to"`
		Cookie        string `json:"cookie"`
		TCPMssDefault int    `json:"tcp_mss_default"`
		TargetBitrate int    `json:"target_bitrate"`
		FqRate        int    `json:"fq_rate"`
		SockBuffsize  int    `json:"sock_bufsize"`
		SndbufActual  int    `json:"sndbuf_actual"`
		RcvbufActual  int    `json:"rcvbuf_actual"`
		TestStart     struct {
			Protocol      string `json:"protocol"`
			NumStreams    int    `json:"num_streams"`
			Blksize       int    `json:"blksize"`
			Omit          int    `json:"omit"`
			Duration      int    `json:"duration"`
			Bytes         int    `json:"bytes"`
			Blocks        int    `json:"blocks"`
			Reverse       int    `json:"reverse"`
			Tos           int    `json:"tos"`
			TargetBitrate int    `json:"target_bitrate"`
			Bidir         int    `json:"bidir"`
			Fqrate        int    `json:"fqrate"`
			Interval      int    `json:"interval"`
		} `json:"test_start"`
	} `json:"start"`
	Intervals []struct {
		Streams []struct {
			Socket        int     `json:"socket"`
			Start         float64 `json:"start"`
			End           float64 `json:"end"`
			Seconds       float64 `json:"seconds"`
			Bytes         int64   `json:"bytes"`
			BitsPerSecond float64 `json:"bits_per_second"`
			Omitted       bool    `json:"omitted"`
			Sender        bool    `json:"sender"`
		} `json:"streams"`
		Sum struct {
			Start         float64 `json:"start"`
			End           float64 `json:"end"`
			Seconds       float64 `json:"seconds"`
			Bytes         int64   `json:"bytes"`
			BitsPerSecond float64 `json:"bits_per_second"`
			Omitted       bool    `json:"omitted"`
			Sender        bool    `json:"sender"`
		} `json:"sum"`
	} `json:"intervals"`
	End struct {
		Streams []struct {
			Sender struct {
				Socket        int     `json:"socket"`
				Start         float64 `json:"start"`
				End           float64 `json:"end"`
				Seconds       float64 `json:"seconds"`
				Bytes         int64   `json:"bytes"`
				BitsPerSecond float64 `json:"bits_per_second"`
				Sender        bool    `json:"sender"`
			} `json:"sender"`
			Receiver struct {
				Socket        int     `json:"socket"`
				Start         float64 `json:"start"`
				End           float64 `json:"end"`
				Seconds       float64 `json:"seconds"`
				Bytes         int64   `json:"bytes"`
				BitsPerSecond float64 `json:"bits_per_second"`
				Sender        bool    `json:"sender"`
			} `json:"receiver"`
		} `json:"streams"`
		SumSent struct {
			Start         float64 `json:"start"`
			End           float64 `json:"end"`
			Seconds       float64 `json:"seconds"`
			Bytes         int64   `json:"bytes"`
			BitsPerSecond float64 `json:"bits_per_second"`
			Sender        bool    `json:"sender"`
		} `json:"sum_sent"`
		SumReceived struct {
			Start         float64 `json:"start"`
			End           float64 `json:"end"`
			Seconds       float64 `json:"seconds"`
			Bytes         int64   `json:"bytes"`
			BitsPerSecond float64 `json:"bits_per_second"`
			Sender        bool    `json:"sender"`
		} `json:"sum_received"`
		CPUUtilizationPercent struct {
			HostTotal    float64 `json:"host_total"`
			HostUser     float64 `json:"host_user"`
			HostSystem   float64 `json:"host_system"`
			RemoteTotal  float64 `json:"remote_total"`
			RemoteUser   float64 `json:"remote_user"`
			RemoteSystem float64 `json:"remote_system"`
		} `json:"cpu_utilization_percent"`
		ReceiverTCPCongestion string `json:"receiver_tcp_congestion"`
	} `json:"end"`
}

func (i *Iperf3Result) ToSpeedTestResult(providerID, providerName string) SpeedTestResult {
	serverName := ""
	serverURL := ""
	if len(i.Start.Connected) > 0 {
		serverName = i.Start.Connected[0].RemoteHost
		serverURL = fmt.Sprintf("%s:%d", i.Start.Connected[0].RemoteHost, i.Start.Connected[0].RemotePort)
	}

	clientIP := ""
	clientHostname := ""
	if len(i.Start.Connected) > 0 {
		clientIP = i.Start.Connected[0].LocalHost
	}

	parts := strings.Split(i.Start.SystemInfo, " ")
	if len(parts) > 1 {
		clientHostname = parts[1]
	}

	// Extract download and upload speeds
	// In iperf3, the sender's bits_per_second in SumSent represents upload
	// The receiver's bits_per_second in SumReceived represents download
	upload := i.End.SumSent.BitsPerSecond / 1000000       // Convert to Mbps
	download := i.End.SumReceived.BitsPerSecond / 1000000 // Convert to Mbps

	return SpeedTestResult{
		Server: struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		}{
			Name: serverName,
			URL:  serverURL,
		},
		Client: struct {
			IP       string `json:"ip"`
			Hostname string `json:"hostname"`
			City     string `json:"city"`
			Region   string `json:"region"`
			Country  string `json:"country"`
			Loc      string `json:"loc"`
			Org      string `json:"org"`
			Postal   string `json:"postal"`
			Timezone string `json:"timezone"`
		}{
			IP:       clientIP,
			Hostname: clientHostname,
		},
		BytesSent:     i.End.SumSent.Bytes,
		BytesReceived: i.End.SumReceived.Bytes,
		Ping:          0,
		Jitter:        0,
		Upload:        upload,
		Download:      download,
		Share:         "",
		ProviderID:    providerID,
		ProviderName:  providerName,
	}
}
