var name,connectedUser,yourCon;

var loginPage = document.querySelector("#login_page"),
    usernameInput = document.querySelector("#username"),
    loginButton = document.querySelector("#login"),
    callPage = document.querySelector("#call_page"),
    otherUsernameInput = document.querySelector("#other_username"),
    callButton = document.querySelector("#call"),
    hangUpButton = document.querySelector("#hang_up");
var yourVideo = document.querySelector("#you"),
    otherVideo = document.querySelector("#other");


callPage.style.display = "none";
//单击按钮登录
loginButton.addEventListener("click",function(event){
    name = usernameInput.value;
    if(name.length>0){
        send({
            type:"login",
            name:name
        })
    }
})
function onLogin(success){
    if(success == false){
        alert("login fail,please try a diffent name");
    }else{
        loginPage.style.display = "none";
        callPage.style.display = "block";
    }
    //准备好通话通道
    startConnection();
}

callButton.addEventListener("click",function(event){
    var othername = otherUsernameInput.value;
    if(othername.length>0){
        startPeerConnection(othername)
    }
})
hangUpButton.addEventListener("click",function(){
    send({
        type:"leave"
    })
    onLeave();
})
var wsConn  = new WebSocket('wss://czobjm.xyz:4430');
wsConn.onopen = function(){
    console.log("connnected");
}
//通过回调函数处理所有消息
wsConn.onmessage = function(message){
    //console.log("Got message:",message.data);
    var data = JSON.parse(message.data);
    switch(data.type){
        case "login":
        onLogin(data.success);
        break;
        case "offer":
        onOffer(data.offer,data.name);
        break;
        case "answer":
        onAnswer(data.answer);
        break;
        case "candidate":
        onCandidate(data.candidate);
        break;
        case "leave":
        onLeave()
        break;
        default:
        break;
    }
}
wsConn.onerror = function(error){
	alert("Got error", error);
    console.log("Got error", error);
}
function send(message){
    if(connectedUser){
        message.name = connectedUser;
    }
    wsConn.send(JSON.stringify(message));
}
function hasUserMedia(){
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.mozGetUserMedia;
    return !! navigator.getUserMedia;
}

function hasRTCPeerConnection(){
    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    return !!window.RTCPeerConnection;
}
function startPeerConnection(user){
    connectedUser = user;
    //开始创建offer
    yourCon.createOffer(function(offer){
        send({
            type:"offer",
            offer:offer
        });

        yourCon.setLocalDescription(offer);
        },function(err){
            alert("An error has occurred.");
        });
};
function onOffer(offer,name){
    connectedUser = name;
    yourCon.setRemoteDescription(new RTCSessionDescription(offer));
    yourCon.createAnswer(function(answer){
        yourCon.setLocalDescription(answer);
        send({
            type:"answer",
            answer:answer
        });
    },function(err){
        alert("An error has occurred");
    });
};
function onAnswer(answer){
    yourCon.setRemoteDescription(new RTCSessionDescription(answer));
};
function onCandidate(candidate){
    yourCon.addIceCandidate(new RTCIceCandidate(candidate));
};
function onLeave(){
    connectedUser = null;
    otherVideo.src = null;
    yourCon.close();
    yourCon.onicecandidate = null;
    yourCon.onaddStream = null;
    setupPeerConnection(stream);
}
function setupPeerConnection(stream){
    var configuration = {
        //iceservcer
        //"iceServers":[{"url":""}]
    };
    yourCon = new RTCPeerConnection(configuration);
    // otherCon = new RTCPeerConnection(configuration);
    //监听流的创建
    yourCon.addStream(stream);

    yourCon.onaddstream = function(e){
        console.log(e)
        otherVideo.src = window.URL.createObjectURL(e.stream);
    }
    // yourCon.ontrack = function(e){
    //     console.log(e)
    //     otherVideo.src = window.URL.createObjectURL(e.stream);
    // }
    //创建ice处理
    yourCon.onicecandidate = function(event){
        if(event.candidate){
            // otherCon.addIceCandidate(new RTCIceCandidate(event.candidate));
            send({
                type:"candidate",
                candidate:event.candidate
            });
        }
    };
}

function startConnection(){
    if(hasUserMedia()){
        navigator.getUserMedia({video:true,audio:false},function(mystream){
            stream = mystream;
            yourVideo.src = window.URL.createObjectURL(stream);
    
            if(hasRTCPeerConnection()){
                setupPeerConnection(stream);
            }else{
                alert("not support(RTCPeerConnection) WebRtc");
            }
        },function(error){
            console.log(error);
            alert("sorry fail to capture your camera ,please try again.")
        });
    }else{
        alert("not support(UserMedia) WebRtc!")
    }
}

