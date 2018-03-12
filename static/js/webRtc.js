var webRtc = function(){
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

var IsAppleDevice = function(){
        if((navigator.userAgent.match(/iPhone/i)) || 
            (navigator.userAgent.match(/iPod/i)) || 
            (navigator.userAgent.match(/iPad/i))) {
            return true;
        }
        else {
            return false;
        }
    };
    
if( IsAppleDevice() && !window.hasSetWXAutoplay ){
    window.hasSetWXAutoplay = true;
    HTMLVideoElement.prototype._play = HTMLVideoElement.prototype.play;
    var wxPlayVideo = function(video) {
        WeixinJSBridge.invoke('getNetworkType', {}, function (e) {
            video._play();
        });
    };

    var play = function() {
        var self = this;
        self._play();
        var evtFns = [];
        try {
            wxPlayVideo(self);
            return;
        } catch (ex) {
            evtFns.push("WeixinJSBridgeReady", function evt() {
                wxPlayVideo(self);
                for (var i = 0; i < evtFns.length; i += 2) document.removeEventListener(evtFns[i], evtFns[i + 1], false);
            });
            document.addEventListener("WeixinJSBridgeReady", evtFns[evtFns.length - 1], false);
        }
    };
    HTMLVideoElement.prototype.play = play;
}
// BandwidthHandler.js
var BandwidthHandler = (function() {
    function setBAS(sdp, bandwidth, isScreen) {
        if (!bandwidth) {
            return sdp;
        }

        if (typeof isFirefox !== 'undefined' && isFirefox) {
            return sdp;
        }

        if (isScreen) {
            if (!bandwidth.screen) {
                console.warn('It seems that you are not using bandwidth for screen. Screen sharing is expected to fail.');
            } else if (bandwidth.screen < 300) {
                console.warn('It seems that you are using wrong bandwidth value for screen. Screen sharing is expected to fail.');
            }
        }

        // if screen; must use at least 300kbs
        if (bandwidth.screen && isScreen) {
            sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
            sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + bandwidth.screen + '\r\n');
        }

        // remove existing bandwidth lines
        if (bandwidth.audio || bandwidth.video || bandwidth.data) {
            sdp = sdp.replace(/b=AS([^\r\n]+\r\n)/g, '');
        }

        if (bandwidth.audio) {
            sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + bandwidth.audio + '\r\n');
        }

        if (bandwidth.video) {
            sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + (isScreen ? bandwidth.screen : bandwidth.video) + '\r\n');
        }

        return sdp;
    }

    // Find the line in sdpLines that starts with |prefix|, and, if specified,
    // contains |substr| (case-insensitive search).
    function findLine(sdpLines, prefix, substr) {
        return findLineInRange(sdpLines, 0, -1, prefix, substr);
    }

    // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
    // and, if specified, contains |substr| (case-insensitive search).
    function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
        var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
        for (var i = startLine; i < realEndLine; ++i) {
            if (sdpLines[i].indexOf(prefix) === 0) {
                if (!substr ||
                    sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
                    return i;
                }
            }
        }
        return null;
    }

    // Gets the codec payload type from an a=rtpmap:X line.
    function getCodecPayloadType(sdpLine) {
        var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
        var result = sdpLine.match(pattern);
        return (result && result.length === 2) ? result[1] : null;
    }

    function setVideoBitrates(sdp, params) {
        params = params || {};
        var xgoogle_min_bitrate = params.min;
        var xgoogle_max_bitrate = params.max;

        var sdpLines = sdp.split('\r\n');

        // VP8
        var vp8Index = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
        var vp8Payload;
        if (vp8Index) {
            vp8Payload = getCodecPayloadType(sdpLines[vp8Index]);
        }

        if (!vp8Payload) {
            return sdp;
        }

        var rtxIndex = findLine(sdpLines, 'a=rtpmap', 'rtx/90000');
        var rtxPayload;
        if (rtxIndex) {
            rtxPayload = getCodecPayloadType(sdpLines[rtxIndex]);
        }

        if (!rtxIndex) {
            return sdp;
        }

        var rtxFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + rtxPayload.toString());
        if (rtxFmtpLineIndex !== null) {
            var appendrtxNext = '\r\n';
            appendrtxNext += 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' + (xgoogle_min_bitrate || '228') + '; x-google-max-bitrate=' + (xgoogle_max_bitrate || '228');
            sdpLines[rtxFmtpLineIndex] = sdpLines[rtxFmtpLineIndex].concat(appendrtxNext);
            sdp = sdpLines.join('\r\n');
        }

        return sdp;
    }

    function setOpusAttributes(sdp, params) {
        params = params || {};

        var sdpLines = sdp.split('\r\n');

        // Opus
        var opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000');
        var opusPayload;
        if (opusIndex) {
            opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
        }

        if (!opusPayload) {
            return sdp;
        }

        var opusFmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + opusPayload.toString());
        if (opusFmtpLineIndex === null) {
            return sdp;
        }

        var appendOpusNext = '';
        appendOpusNext += '; stereo=' + (typeof params.stereo != 'undefined' ? params.stereo : '1');
        appendOpusNext += '; sprop-stereo=' + (typeof params['sprop-stereo'] != 'undefined' ? params['sprop-stereo'] : '1');

        if (typeof params.maxaveragebitrate != 'undefined') {
            appendOpusNext += '; maxaveragebitrate=' + (params.maxaveragebitrate || 128 * 1024 * 8);
        }

        if (typeof params.maxplaybackrate != 'undefined') {
            appendOpusNext += '; maxplaybackrate=' + (params.maxplaybackrate || 128 * 1024 * 8);
        }

        if (typeof params.cbr != 'undefined') {
            appendOpusNext += '; cbr=' + (typeof params.cbr != 'undefined' ? params.cbr : '1');
        }

        if (typeof params.useinbandfec != 'undefined') {
            appendOpusNext += '; useinbandfec=' + params.useinbandfec;
        }

        if (typeof params.usedtx != 'undefined') {
            appendOpusNext += '; usedtx=' + params.usedtx;
        }

        if (typeof params.maxptime != 'undefined') {
            appendOpusNext += '\r\na=maxptime:' + params.maxptime;
        }

        sdpLines[opusFmtpLineIndex] = sdpLines[opusFmtpLineIndex].concat(appendOpusNext);

        sdp = sdpLines.join('\r\n');
        return sdp;
    }

    return {
        setApplicationSpecificBandwidth: function(sdp, bandwidth, isScreen) {
            return setBAS(sdp, bandwidth, isScreen);
        },
        setVideoBitrates: function(sdp, params) {
            return setVideoBitrates(sdp, params);
        },
        setOpusAttributes: function(sdp, params) {
            return setOpusAttributes(sdp, params);
        },
        setLcps: function(sdp, audioBitrate, videoBitrate, isAppleDevice){
            audioBitrate = audioBitrate || 128;
            videoBitrate = videoBitrate || 1024;
            var bandwidth = {
                screen: 300, // 300kbits minimum
                audio: audioBitrate,   // 50kbits  minimum
                video: videoBitrate   // 256kbits (both min-max)
            };
            var isScreenSharing = false;

            sdp = setBAS(sdp, bandwidth, isScreenSharing);
            sdp = setVideoBitrates(sdp, {
                min: bandwidth.video,
                max: bandwidth.video
            });
            sdp = setOpusAttributes(sdp, {
                'stereo': 1,
                'sprop-stereo': 1,
                'maxaveragebitrate': audioBitrate * 1024 * 8, // 96 kbits
                'maxplaybackrate': audioBitrate * 1024 * 8, // 96 kbits
                'cbr': 0, // disable cbr
                'useinbandfec': 1, // use inband fec
                'usedtx': 1, // use dtx
                'maxptime': 40
            });

            //鑻规灉璁惧浣跨敤264缂栫爜
            if( isAppleDevice ){
                sdp = sdp.replace( "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 124 127 123 125 107 108" , 
                    'm=video 9 UDP/TLS/RTP/SAVPF 100 101 102 124 127 123 125 107 108 96 97 98 99');
            }
            return sdp;
        },
    };
})();
//webrtc播放器
var Player = function(){
    var _player = "";
    var LcpsWebrtcPlay = function(videoID, addr, rtcStream, errorCallback){

        var RtcPlay = function(audioKBitrate, videoKBitrate){
    
            var pc = new RTCPeerConnection(null);
    
            pc.onconnectionstatechange = function(event) {
                switch(pc.connectionState) {
                    case "connected":
                        // The connection has become fully connected
                        break;
                    case "disconnected":
                    case "failed":
                        // One or more transports has terminated unexpectedly or in an error
                        break;
                    case "closed":
                        // The connection has been closed
                        break;
                }
                console.log(pc.connectionState);
            };
    
            // 发送ICE候选到其他客户端
            pc.onicecandidate = function(event){
                if (event.candidate !== null) {
                    socket.send(JSON.stringify({
                        "event": "_ice_candidate",
                        "data": {
                            "candidate": event.candidate
                        }
                    }));
                }
            };
    
            var hasAttach = false;
            pc.onaddstream = function(event){
                if( hasAttach ){
                    return;
                }
                hasAttach = true;
                document.getElementById(videoID).src = URL.createObjectURL(event.stream);
                document.getElementById(videoID).play();
            };
            pc.ontrack = function(event){
                if( hasAttach ){
                    return;
                }
                hasAttach = true;
                document.getElementById(videoID).srcObject = event.streams[0];
                document.getElementById(videoID).play();
            };
    
            sendAnswerFn = function(desc){
                desc.sdp = BandwidthHandler.setLcps(desc.sdp, audioKBitrate, videoKBitrate);
                pc.setLocalDescription(desc);
                socket.send(JSON.stringify({ 
                    "event": "_answer",
                    "data": {
                        "sdp": desc
                    }
                }));
            };
    
            //处理到来的信令
            this.onmessage = function(json){
                // console.log(json.event);
                if( json.event === "_ice_candidate" ){
                    pc.addIceCandidate(new RTCIceCandidate(json.data.candidate));
                } else {
                    if( json.event === "_offer" || 
                        json.event === "_answer") {
                        pc.setRemoteDescription(new RTCSessionDescription(json.data.sdp));
                    }
                    // 如果是一个offer，那么需要回复一个answer
                    if(json.event === "_offer") {
                        pc.createAnswer(sendAnswerFn, function (error) {
                            console.log('Failure callback: ' + error);
                        });
                    }
                }
            };
    
            this.close = function(){
                pc.close();
            };
        };
    
        var rtcplay = null;
        var hasReconnect = false;
        // 与信令服务器的WebSocket连接
        var socket = new WebSocket(addr);
        socket.onopen = function(){
            console.log("连接成功...");
            socket.send(JSON.stringify({
                "event": "StartPlay",
                "data": {
                    "variefy": "fLJJFM2xUNmOoIpr",
                    "stream": rtcStream
                }
            }));
        };
        socket.onmessage = function(event){
            var json = JSON.parse(event.data);
            console.log(json);
            if(json.event === "OnStartPublish"){
                if( rtcplay ){
                    rtcplay.close();
                }
                rtcplay = new RtcPlay(json.data.audioKBitrate, json.data.videoKBitrate);
            }
            else if(json.event === "OnError"){
                if(errorCallback){
                    errorCallback(json.data);
                }
            }else{
                if(rtcplay){
                    rtcplay.onmessage(json);
                }
            }
        };
        socket.onclose = function(){
            // console.log("onclose...");
            if( rtcplay ){
                rtcplay.close();
                rtcplay = null;
            }
            setTimeout(function(){
                if( !hasReconnect ){
                    hasReconnect = true;
                    LcpsWebrtcPlay(videoID, addr, rtcStream, errorCallback);
                }
            }, 1000);
        };
        socket.onerror = socket.onclose;
    };
    this.preare = function(){
        if(!!opt.isplayer && !!opt.playerVideo){
            _player = new LcpsWebrtcPlay(opt_.playerVideo,opt_.addr,opt_.rtcStream);
        }else{
            console.log("error : no playerVideo or do not allow play!")
        }
    }
}
//推流到Lcps
var Pusher = function(){
        var LcsPusher_ = {};
    this.preare = function(){
        LcpsPusher_ = new LcpsPush({
            videoObj:opt_.localVideo,
            rtcStream:opt_.stream,
            addr:opt_.addr
        })
    }
    this.start = function(){
        lcpsPusher_.pushStream();
    }
    this.stop = function(){
        lcpsPusher_.stopStream();
    }
    this.changeSet = function(opt){
        var callback = "";
        if(opt.callback){
            callback = opt.callback;
        }
        lcpsPusher_.changeCamera({
            audioIndex:opt.audioIndex,//音频设备 int 默认0
            videoIndex:opt.videoIndex,//视屏设备 int 默认0
            videoState:opt.videoState,//是否使用视屏 boolen 默认 true
            audioState:opt.audioState,//是否使用音频 boolen 默认 true
            callback = opt.callback,
        })
    }
    var LcpsPush = function(option){
        var _this = this;
        _this.videoObj = option.videoObj;
        _this.rtcStream = option.rtcStream;    
        _this.addr = option.addr ? option.addr :"wss://rtc.aodianyun.com:443";
        _this.stream = '';
        _this.socket = '';
        _this.pc = '';
        _this.fluConnectFlag = false;   
        _this.userCatDown = false;    
        _this.systemAvaible = true;
        _this.systemDeviceInfos = {videoinput:[],audioinput:[]};
        _this.init();
    };
    LcpsPush.systemAvaible = function(){
        var _this = this;
        return _this.systemAvaible;
    };
    LcpsPush.prototype.init = function(){
        var _this = this;
        this.checkSystem();
        function gotDevices(deviceInfos) {
            
            // var node12 = document.createTextNode(JSON.stringify(_this.systemDeviceInfos));
            // document.getElementsByTagName('div')[0].appendChild(node12);
            for (var i = 0; i !== deviceInfos.length; ++i) {
              var deviceInfo = deviceInfos[i];
              var value = deviceInfo.deviceId;
              var text = '';
    
              if (deviceInfo.kind === 'audioinput') {
                text = deviceInfo.label ||
                  'microphone ' + (_this.systemDeviceInfos.audioinput.length + 1);
                  _this.systemDeviceInfos.audioinput.push({text:text,value:value});
              } else if (deviceInfo.kind === 'videoinput') {
                text = deviceInfo.label || 'camera ' +
                  (_this.systemDeviceInfos.videoinput.length + 1);
                  _this.systemDeviceInfos.videoinput.push({text:text,value:value});
              } else {
                console.info('Found one other kind of source/device: ', deviceInfo);
                continue;
              }
            }
          }
          function getStream() {
            if (_this.stream) {
                _this.stream.getTracks().forEach(function(track) {
                track.stop();
              });
            }
          
            var constraints = {
                audio: {
                  deviceId: {exact: _this.systemDeviceInfos.audioinput[0].value}
                },
                video: {
                  deviceId: {exact: _this.systemDeviceInfos.videoinput[0].value}
                }
              };
              if (isMobile.iOS()) {
                constraints = {
                    audio: {
                      deviceId: {exact: _this.systemDeviceInfos.audioinput[0].value}
                    },
                    video: {
                      deviceId: {exact: _this.systemDeviceInfos.videoinput[1].value}
                    }
                  };
                }
            _this.openCamera({
                constraints:constraints,
                callback:function(data){
                    _this.stream = data.stream;
                    _this.fluConnectFlag = data.flag == 100 ? true : false;
                    if ( _this.IsAppleDevice()) {
                        var temp =  _this.stream;
                        _this.videoObj.srcObject = temp;
                    } else {
                        var temp1 = URL.createObjectURL(_this.stream);
                        _this.videoObj.src = temp1;
                    }                                                    
                }
            });
            
          }
        function handleError(error) {
            console.log('Error: ', error);
        }
        navigator.mediaDevices.enumerateDevices().then(gotDevices).then(getStream).catch(handleError);
    
    };
    LcpsPush.prototype.changeCamera = function(option){
        var _this = this;
        if (_this.stream) {
            _this.stream.getTracks().forEach(function(track) {
            track.stop();
          });
        }
        var audioIndex = typeof option.audioIndex != undefined ? option.audioIndex : 0;
        var videoIndex = typeof option.videoIndex != undefined ? option.videoIndex : 0;
        var audioState = typeof option.audioState != undefined ? option.audioState : true;
        var videoState = typeof option.videoState != undefined ? option.videoState : true;
    
        var constraints = '';
        if(audioState && videoState){
            constraints = {
                audio: {
                  deviceId: {exact: _this.systemDeviceInfos.audioinput[audioIndex].value}
                },
                video: {
                  deviceId: {exact: _this.systemDeviceInfos.videoinput[videoIndex].value}
                }
              };
        }
        if(audioState && !videoState){
            constraints = {
                audio: {
                  deviceId: {exact: _this.systemDeviceInfos.audioinput[audioIndex].value}
                },
                video: false
              };
        }
        if(!audioState && videoState){
            constraints = {
                audio: false,
                video: {
                  deviceId: {exact: _this.systemDeviceInfos.videoinput[videoIndex].value}
                }
              };
        }
        if(!audioState && !videoState){
            constraints = {
                audio: false,
                video: false
              };
        }
    
        _this.openCamera({
            constraints:constraints,
            callback:function(data){
                _this.stream = data.stream;
                _this.fluConnectFlag = data.flag == 100 ? true : false;
                if ( _this.IsAppleDevice()) {
                    var temp =  _this.stream;
                    _this.videoObj.srcObject = temp;
                } else {
                    var temp1 = URL.createObjectURL(_this.stream);
                    _this.videoObj.src = temp1;
                }  
                if(option.callback)   option.callback();                                             
            }
        });
    };
    LcpsPush.prototype.pushStream = function(){
        var _this = this;
        _this.userCatDown = false; 
        if(_this.fluConnectFlag){
           _this.linkSystem(_this.stream);
            
        } 
    };
    LcpsPush.prototype.stopStream = function(){
        var _this = this;
        _this.userCatDown = true;   
        _this.socket.close();
        _this.pc.close();
    };
    LcpsPush.prototype.IsAppleDevice = function(){
        if((navigator.userAgent.match(/iPhone/i)) || 
            (navigator.userAgent.match(/iPod/i)) || 
            (navigator.userAgent.match(/iPad/i))) {
            return true;
        }
        else {
            return false;
        }
    };
    LcpsPush.prototype.checkSystem = function(){
        _this = this;
        navigator.getUserMedia = navigator.getUserMedia ||
                                 navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia ||
                                 navigator.msGetUserMedia;  
    
        if( navigator.getUserMedia == null ){
            _this.videoObj.style.display = "none";
            var tip = "当前浏览器不支持webrtc发布";
    
            var ua = navigator.userAgent.toLowerCase();
            if( this.IsAppleDevice()){
                s = ua.match(/os ([\d.]+)_([\d.]+)/);
                if(s){
                    var osVersion = s[1] + "." + s[2];
                    if( parseFloat( osVersion ) < 11.2 ){
                        tip = "当前系统版本IOS" + osVersion + "，请升级系统至IOS11.2及以上版本";                      
                      
                     }else{
                        tip = "请在safari浏览器中打开此链接"; 
                        var img = document.createElement("img");
                        img.className = 'arrow';
                        img.src = "img/arrow.png";  
                    }
                }
            }
       
            var para = document.createElement("div");
            var node1 = document.createElement("div");        
            var node12 = document.createTextNode('!');
            node1.className = 'sig';
            node1.appendChild(node12);
            
            var node2 = document.createTextNode(tip);
            para.className = 'lcpsPushTip';
            para.appendChild(node1);
            para.appendChild(node2);
            var element = document.getElementsByTagName("body")[0] ;
            element.appendChild(para);
            if(typeof img != 'undefined'){
                element.appendChild(img);
            }
            _this.systemAvaible =  false;
           
        }
        
    };
    LcpsPush.prototype.openCamera = function(option){
        
        var _this = this;
        var callback = option.callback;
        var constraints = option.constraints;
        
        function gotStream(stream){
            callback({flag:'100',flagString:'success',stream:stream});
        }
        function handleError(error){
              console.log('getUserMedia error: ' + error);
              
              callback({flag:'200',flagString:'getUserMedia error: ' + error,stream:''});
        }
        navigator.mediaDevices.getUserMedia(constraints).
              then(gotStream).catch(handleError);
    
       
    
    };     
    LcpsPush.prototype.linkSystem = function(_stream){ 
        
        var rtcStream = this.rtcStream || "pgm";  
        var stream = _stream;    
          
        var _this = this;
        var isMapEmpty = function(map){
                var isEmpty = true;
                for(var key in map){
                    isEmpty = false;
                    break;
                }
                return isEmpty;
        };
        var publishMap = {};
        var WebrtcPublish = function(socket, stream, id){
            var sendOfferFn = function(desc){
                desc.sdp = BandwidthHandler.setLcps(desc.sdp);
                _this.pc.setLocalDescription(desc);
                var msg = JSON.stringify({
                    "event": "_offer",
                    "data": {
                        "id": "" + id,
                        "sdp": desc
                    }
                });
                socket.send(msg);
            },
            sendAnswerFn = function(desc){
                _this.pc.setLocalDescription(desc);
                socket.send(JSON.stringify({ 
                    "event": "_answer",
                    "data": {
                        "id": "" + id,
                        "sdp": desc
                    }
                }));
            };
            var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
            _this.pc = new RTCPeerConnection(null);
            
            _this.pc.addStream(stream);
            _this.pc.createOffer(sendOfferFn, function (error) {
                console.log('Failure callback: ' + error);
            });
    
    
            _this.pc.onicecandidate = function(event){
                if (event.candidate !== null) {
                    var msg = JSON.stringify({
                        "event": "_ice_candidate",
                        "data": {
                            "id": "" + id,
                            "candidate": event.candidate
                        }
                    });
                    socket.send(msg);
                }
            };
    
            _this.pc.onconnectionstatechange = function(event) {
                switch(_this.pc.connectionState) {
                    case "connected":
                        // The connection has become fully connected
                        break;
                    case "disconnected":
                    case "failed":
                        // One or more transports has terminated unexpectedly or in an error
                        break;
                    case "closed":
                        // The connection has been closed
                        break;
                }
                console.log(_this.pc.connectionState);
            };
    
            this.onmessage = function(json){
                //如果是一个ICE的候选，则将其加入到PeerConnection中，否则设定对方的session描述为传递过来的描述
                if( json.event === "_ice_candidate" ){
                    _this.pc.addIceCandidate(new RTCIceCandidate(json.data.candidate));
                } else {
                    if( json.event === "_offer" || 
                        json.event === "_answer") {
                        _this.pc.setRemoteDescription(new RTCSessionDescription(json.data.sdp));
                    }
                    // 如果是一个offer，那么需要回复一个answer
                    if(json.event === "_offer") {
                        _this.pc.createAnswer(sendAnswerFn, function (error) {
                            console.log('Failure callback: ' + error);
                        });
                    }
                }
            };
    
            this.close = function(){
                _this.pc.close();
            };
        };
    
        var OnCreateMediaStream = function(stream){          
                var hasReconnect = false;
                var addr = _this.addr;
                _this.socket = new WebSocket(addr);
                _this.socket.onopen = function(){
                    _this.socket.send(JSON.stringify({
                        "event": "StartPublish",
                        "data": {
                            "variefy": "Mc9RO84fuPME5YnJ",
                            "stream": rtcStream
                        }
                    }));
                    // _socket = socket;
                
                };
    
                var EchoPingMsg = JSON.stringify({
                            "event": "EchoPing",
                            "data": {}
                        });
                _this.socket.onmessage = function (event) { 
                    var json = JSON.parse(event.data);
                    if( json.event == "OnStartPlay" ){
                        if( publishMap[json.data.id] ){
                            publishMap[json.data.id].close();
                        }
                        publishMap[json.data.id] = new WebrtcPublish(_this.socket, stream, json.data.id);
                    }else if( json.event == "OnStopPlay" ){
                        if( publishMap[json.data.id] ){
                            publishMap[json.data.id].close();
                            delete publishMap[json.data.id];
    
                            if( isMapEmpty(publishMap) ){
                                //window.location = window.location;
                            }
                        }
                    }else if( json.event == "Ping" ){
                        _this.socket.send(EchoPingMsg);
                    }else{
                        publishMap[json.data.id].onmessage(json);
                    }
                };
    
                _this.socket.onclose = function(){
                    // _socket = null;
                    if(_this.userCatDown){return;}
                    setTimeout(function(){
                        if( !hasReconnect ){
                            hasReconnect = true;
                            OnCreateMediaStream(stream);
                        }
                    }, 1000);
                };
                _this.socket.onerror = _this.socket.onclose;
              
        };
    
     
      OnCreateMediaStream(stream);
    };    
}

return{
        Init:function(opt){
            opt_.localVideo = opt.localVideo;            
            opt_.addr = opt.addr;
            opt_.stream = opt.stream;
            opt_.rtcStream = "mcu"+opt.stream;
            if(!!opt.isplayer && !!opt.playerVideo){
                opt_.playerVideo = opt.playerVideo; 
            }
        },
        LcpsPusher:new Pusher(),
        LcpsWebrtcPlay:new Player(),
    }
}();