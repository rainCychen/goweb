package webrtc

import (
	"encoding/json"
	"time"

	"github.com/astaxie/beego/logs"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

// connection is an middleman between the websocket connection and the hub.
type connection struct {
	// The websocket connection.
	ws *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte
}

// readPump pumps messages from the websocket connection to the hub.
func (c *connection) readPump() {
	defer func() {
		h.unregister <- c
		c.ws.Close()
	}()
	c.ws.SetReadLimit(maxMessageSize)
	c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error { c.ws.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			break
		}
		h.broadcast <- message
	}
}

type Msg struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
	Name string      `json:"name"`
}

var nameMap = make(map[string]time.Time)

// write writes a message with the given message type and payload.
func (c *connection) write(mt int, payload []byte) error {
	c.ws.SetWriteDeadline(time.Now().Add(writeWait))
	msg := Msg{}
	err := json.Unmarshal(payload, &msg)
	if err != nil {
		logs.Warning("json decode failed %v", err.Error())
		logs.Debug(string(payload))
	}
	if msg.Type == "login" {
		if _, ok := nameMap[msg.Name]; ok {
			msg.Data = false
		} else {
			nameMap[msg.Name] = time.Now()
			msg.Data = true
		}
	}
	var Byte []byte
	if Byte, err = json.Marshal(msg); err != nil {
		logs.Warning("json encode failed %v", err.Error())
	}
	logs.Debug(msg)
	return c.ws.WriteMessage(mt, Byte)
}

// writePump pumps messages from the hub to the websocket connection.
func (c *connection) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.ws.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.write(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.write(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.write(websocket.PingMessage, []byte{}); err != nil {
				return
			}
		}
	}
}
