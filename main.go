package main

import (
	"goweb/controllers/webrtc"
	_ "goweb/routers"

	"github.com/astaxie/beego"
)

func main() {
	webrtc.New()
	beego.Run()
}
