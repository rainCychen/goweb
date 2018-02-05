package routers

import (
	"goweb/controllers"

	"github.com/astaxie/beego"
)

func init() {
	beego.Router("/", &controllers.MainController{})
	beego.AutoRouter(&controllers.TestController{})
	beego.Router("/ws", &controllers.ChartController{})
	beego.Router("/ws/join", &controllers.ChartController{}, "get:Join")
}
