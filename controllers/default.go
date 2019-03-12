package controllers

import (
	"github.com/astaxie/beego"
	"goweb/models"
	"fmt"
	"strconv"
	"github.com/astaxie/beego/logs"
)

type MainController struct {
	beego.Controller
	
}
// var l = logs.GetLogger()
// func init(){
// 	logs.SetLogger("console")
	
// }
func (c *MainController) Get() {
	id := c.Ctx.Input.Param(":id")
	logs.Debug(id)
	if id!=""{
		uid, _ := strconv.Atoi(id)
		user,err := models.GetUser(uid)
		if(err!=nil){
			fmt.Println(err.Error())
			c.Abort("dberror")
			// c.Data["info"]= err.Error()
			// c.TplName = "error.html"
			
		}
		c.Data["User"] = user.Name
	}
	c.Data["Website"] = "123456788"
	c.Data["Email"] = "xxxxx@gmail.com"
	c.TplName = "index.html"
	c.Data["hello"] = "hello world!"
}
