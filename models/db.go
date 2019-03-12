package models
import(
    "github.com/astaxie/beego/orm"
    "errors"
    _ "github.com/go-sql-driver/mysql"
    // "fmt"
)
type User struct {
    Id   int
    Name string `orm:"size(100)"`
}
func init() {
    // orm.RegisterDriver("mysql", orm.DRMySQL)
    // 容器部署用 172.17.0.2:3306 本地开发 localhost:3307
    orm.RegisterDataBase("default", "mysql", "root:cz@mysql@tcp(172.17.0.2:3306)/myweb?charset=utf8") 

    orm.RegisterModel(new(User))
}
func GetUser(id int) (*User,error){
    
    o := orm.NewOrm()
    // o.Using("default")
    user := User{Id: id}
    err := o.Read(&user)
    if err == orm.ErrNoRows {
        return nil,errors.New("查询不到")
	} else if err == orm.ErrMissPK {
        return nil,errors.New("找不到主键")
    }
    return &user,nil
    
}