package controllers

import (
	"github.com/astaxie/beego"
)

type TestController struct {
	beego.Controller
}

func (c *TestController) Get() {
	c.TplName = "test.html"
	c.Data["test"] = "xxxxxxxxxxxx"
}
