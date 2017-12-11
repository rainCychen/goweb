package controllers

import (
	"github.com/astaxie/beego"
)

type MainController struct {
	beego.Controller
}

func (c *MainController) Get() {
	c.Data["Website"] = "czobjm.xyz"
	c.Data["Email"] = "xxxxx@gmail.com"
	c.TplName = "index.html"
	c.Data["hello"] = "hello world!"
}
