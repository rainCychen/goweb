# goweb
go-docker

beego项目

1. testDocker目录下
docker build -t raincyc/myweb:01 ./

2. goweb容器和dockermysql容器互联
    - mysql数据库容器创建
    ```
    docker run --name dockermysql  -p 3307:3306 -e MYSQL_ROOT_PASSWORD=cz@mysql -d mysql
    ```

    - 语法
    ```
    --link <name or id>:alias
    ```
    - goweb容器创建
    ```
    docker run -it -v /Users/cz/work/Golang/src:/go/src -w /go/src/goweb  --name goweb -p 8088:8088 --link dockermysql:dockermysql  -d raincyc/myweb:01
    ```

链接:本地localhost：3307
容器之间互连 需要用容器的ip 通过docker inspect 容器name或ID 查看 IPAddress