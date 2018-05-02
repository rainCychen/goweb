package webrtc

import (
	"net/http"

	"github.com/astaxie/beego"
	"github.com/gorilla/websocket"
)

type ChartController struct {
	beego.Controller
}

func (c *ChartController) Get() {
	c.TplName = "chart.html"
}

func (c *ChartController) Join() {
	if c.Ctx.Request.Method != "GET" {
		http.Error(c.Ctx.ResponseWriter, "Method not allowed", 405)
		return
	}
	ws, err := websocket.Upgrade(c.Ctx.ResponseWriter, c.Ctx.Request, nil, 0, 0)
	if _, ok := err.(websocket.HandshakeError); ok {
		http.Error(c.Ctx.ResponseWriter, "Not a websocket handshake", 400)
		return
	} else if err != nil {
		beego.Error("Cannot setup WebSocket connection:", err)
		return
	}

	con := &connection{send: make(chan []byte, 256), ws: ws}
	h.register <- con
	go con.writePump()
	con.readPump()
}
