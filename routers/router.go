package routers

import (
	"goweb/controllers"
	"goweb/controllers/webrtc"

	"github.com/astaxie/beego"
)

func init() {
	beego.Router("/", &controllers.MainController{})
	beego.AutoRouter(&controllers.TestController{})
	beego.Router("/ws", &webrtc.ChartController{})
	beego.Router("/ws/join", &webrtc.ChartController{}, "get:Join")
}
