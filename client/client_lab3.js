var mySocketID = 0;
var loginResult = false;
var list_rooms = [];
var messageLogs = [];
var registerResult = true;

//CONNECTION TO THE SOCKET
//var socket = new WebSocket("ws://localhost:9043");
var socket = new WebSocket("wss://ecv-etic.upf.edu/node/9043/ws/");
socket.onopen = function(){  
    console.log("Socket has been opened! :)");
    //this.send('Hello server!');  //send something to the server
}

socket.addEventListener("close", function(e) {
    console.log("Socket has been closed: ", e); 
});


socket.onerror = function(err){  
    console.log("error: ", err );
}


function onMessageReceived(str_msg) {
    console.log(str_msg.data);
    var msg = JSON.parse(str_msg.data);
    
    if(msg.type == "newSocket"){ //when the server assigns me an id I receive it and store it
        mySocketID = msg.mySocketID;
        console.log("Received socket num : " + mySocketID);
        
    }else if(msg.type == "login_result"){
        console.log(msg.content);
        loginResult = true;
        list_rooms = msg.rooms;
    }else if(msg.type == "message"){
        //save message to the logs
        messageLogs.push(msg);
        //write message in the screen
        var html = '<div class= "message_received"><p class="username_sender">' + msg.username + ':</p><p class="content_message_rec">' + msg.content + '</p></div>';
        document.getElementById('result').innerHTML += html;
        document.getElementById('scroll').scrollTop = 100000;
        
    }else if(msg.type == "pointer"){
        addPointer(msg.x, msg.y, msg.z, msg.pointerName);
        
    }else if(msg.type == "remove"){
        console.log("removing...");
        removePointer(msg.pointerName);
        var child_node = scene.root.findNodeByName( msg.pointerName );
        scene.root.removeChild( child_node );
        
    }else if(msg.type == "greenPlane"){
        addPlane(msg.x, msg.y, msg.z, msg.pointerName, false);
        
    }else if(msg.type == "redPlane"){
        addPlane(msg.x, msg.y, msg.z, msg.pointerName, true);
    } 
    else if(msg.type == "sendLogs"){
        console.log("You have to send the logs to " + msg.to);
        //send pointer logs
        for (i=0; i<list_objects.length; i++){
            var message = {
                object: list_objects[i],
                type: "log",
                sendTo: msg.to
            }
            socket.send(JSON.stringify(message));
            console.log("sending pointer num " + i);
        }
        //send message logs
        for(i=0; i< messageLogs.length; i++){
            messageLogs[i].type = "logmessage";
            messageLogs[i].sendTo =  msg.to;
            socket.send(JSON.stringify(messageLogs[i]));
        }
        
    }else if(msg.type == "log"){
        // recibo los logs del guardian
        console.log("received log");
        logReceived = true;
        if(msg.object.obj_type == "pointer"){
            addPointer(msg.object.x, msg.object.y, msg.object.z, msg.object.id);
        }else if(msg.object.obj_type == "redPlane"){
            addPlane(msg.object.x, msg.object.y, msg.object.z, msg.object.id, true);
        }else if(msg.object.obj_type == "greenPlane"){
            addPlane(msg.object.x, msg.object.y, msg.object.z, msg.object.id, false);
        }
        
    }else if(msg.type == "keeperOut"){
        var message = {
            type: "keeperIn",
            mySocketID: mySocketID
        }
        socket.send(JSON.stringify(message));
    
        
    }else if(msg.type == "DB"){
        if(msg.pointers != ""){
            var plist = JSON.parse(msg.pointers);
            for(i = 0; i<plist.length; i++){
                if(plist[i].obj_type == "pointer"){
                    addPointer(plist[i].x, plist[i].y, plist[i].z,plist[i].id);
                }else if(plist[i].obj_type == "redPlane"){
                    addPlane(plist[i].x, plist[i].y, plist[i].z, plist[i].id, true);
                }else if(plist[i].obj_type == "greenPlane"){
                    addPlane(plist[i].x, plist[i].y, plist[i].z, plist[i].id, false);
                }
            }    
        }
    }else if(msg.type == "register_fail"){
        console.log("register failed :(");
        registerResult = false;
    }
    
}
    

socket.onmessage = onMessageReceived;


var register_btn = document.getElementById("register");

//Register a new user
register_btn.addEventListener("click", function(e){

    var username =  document.getElementById("username").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var password2 = document.getElementById("password2").value;
    
    if(username == "" || email == "" || password == ""){
        alert("Some fields are missing...");
    }else if(password != password2){ 
        alert("Passwords do not match!");
    }else{
        var new_register = {
             type: "register",
             username: username,
             email: email,
             password: password,
             socketID: mySocketID
        };   
        socket.send(JSON.stringify(new_register));
        setTimeout(function(){ if(!registerResult){alert("Username already exists :("); registerResult = true; }else{
            //if the register went well, open login page
            alert("Register successful!");
            document.getElementById('register-form').style.display = "none";
            document.getElementById('login-form').style.display = "grid";
        } }, 1000);
    }

});


//go to login page
var login = document.getElementById("login");
login.addEventListener("click", function(e){
    document.getElementById('register-form').style.display = "none";
    document.getElementById('login-form').style.display = "grid";

});

//go to sign page
var signin = document.getElementById("goto_signin");
signin.addEventListener("click", function(e){
    document.getElementById('register-form').style.display = "grid";
    document.getElementById('login-form').style.display = "none";

});

//Send sign in form to server
login_btn.addEventListener("click", function(e){

    var username =  document.getElementById("username_login").value;
    var password = document.getElementById("password_login").value;
    
    var login_user = {
             type: "login",
             username: username,
             password: password,
             socketID: mySocketID
        };            
     socket.send(JSON.stringify(login_user));
     setTimeout(function(){ if(!loginResult){alert("Log in failed");}else{enterCanvas();} }, 1000);
});

function enterCanvas(){
    document.getElementById("wrap").style.display = "grid";
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "none";  
    document.getElementById("rooms_panel").style.display = "grid";
    document.getElementById("logoContainer").style.display = "none";
    document.body.setAttribute("style", "background-image: none;")
   //document.getElementById("rooms").style.display = "block";
    for(i = 0; i< list_rooms.length ; i++){
        document.getElementById("rooms").innerHTML += '<li id="' +list_rooms[i] + '" onclick="changeRoom(this.id, false)">' + list_rooms[i] + "</li>";
    }
}
function changeRoom(room, newroom) //newroom = TRUE/FALSE
{
    var username =  document.getElementById("username_login").value;
      var msg = {
             type: "room",
             room: room,
             username: username,
             socketID: mySocketID
        };
     if(newroom == true) msg.type = "newroom";   
     socket.send(JSON.stringify(msg));
     
     //delete the panel in which the user enters a room name
     document.getElementById("rooms_panel").style.display = "none";
     //display canvas without blur
     document.getElementById("myCanvas").setAttribute("style","-webkit-filter:none;");
     //delete messages of previous room
     document.getElementById("result").innerHTML = "";
     messageLogs.splice(0, messageLogs.length);
     //delete pointers of previous earth
     //list_objects.splice(0, list_objects.length);
     //display message before entering canvas
     tempAlert("Your are going to room " + room + " ...", 1500);
     
     //after 3 seconds, display name of the room in the title:
     setTimeout(function(){ document.getElementById("room_title").innerHTML = '<p class="title" id="room_title">' + room + '</p>';
                            document.getElementById("tools").style.display = "inline-grid";
    },1500);
    

}

function send_message() {
    var text = document.getElementById('messagebox').value;   
    
    if(text != ""){
        var html = '<div class= "message"><p class="content_message">' + text + '</p></div>';
        document.getElementById('result').innerHTML += html;
        document.getElementById('scroll').scrollTop = 100000;
        
        var username =  document.getElementById("username_login").value;
        var msg = {
            content: text,
            username: username,
            type: "message",
            mySocketID: mySocketID,
        };
        
        messageLogs.push(msg);
        
        socket.send(JSON.stringify(msg));

        document.getElementById('messagebox').value = "";
    }
   

}

var input = document.getElementById('messagebox');

input.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.getElementById("say").click();
    }
});

//temporary alert that will replace canvas while changing room
function tempAlert(msg,duration)
{
    var element = document.getElementById('myCanvas');
    var positionInfo = element.getBoundingClientRect();
    var height = positionInfo.height;
    var width = positionInfo.width;
    //console.log("width: " + width);
    //console.log("height: " + height);
    
    var el = document.createElement("div");
    el.setAttribute("style","position:absolute;top:88px; background-color:white; width: "+ width + "px;height:" + height + "px;");
    el.innerHTML = '<p id = "alert_msg">' + msg + '</p>';
    setTimeout(function(){ el.parentNode.removeChild(el);},duration);
    document.body.appendChild(el);
}

//create a new room
var roomButton = document.getElementById("room-request");
roomButton.addEventListener("click", function(e){
    var roomName =  document.getElementById("createRoom").value;
    
    if(roomName != "") {
        changeRoom(roomName, true);
    }else{
        alert("invalid room name :(");
    }                      
    
});

window.addEventListener("beforeunload", function (e) {

    // *********** perform database operation here
    // before closing the browser ************** //
    var stringDB = JSON.stringify(list_objects);
    var msg = {
        type: "storeDB",
        mySocketID: mySocketID,
        datalist: stringDB
    }
    socket.send(JSON.stringify(msg));
    // added the delay otherwise database operation will not work
    for (var i = 0; i < 500000000; i++) { }
        return undefined;
});




