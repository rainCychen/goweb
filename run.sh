#!/bin/bash
nohup 'bee run goweb' > '/var/log/goweb/goweb.log' 2>&1 &
