//Var to store selected tool
var tool = "move";
//listeners for the tools
document.getElementById("tool1").addEventListener("click", function(e){
   tool = "move";
});
document.getElementById("tool2").addEventListener("click", function(e){
   tool = "pointer";
});
document.getElementById("tool3").addEventListener("click", function(e){
   tool = "remove";
});
document.getElementById("tool4").addEventListener("click", function(e){
   tool = "greenPlane";
});
document.getElementById("tool5").addEventListener("click", function(e){
   tool = "redPlane";
});
document.getElementById("tool6").addEventListener("click", function(e){
   exitCanvas();
});


function exitCanvas(){
     window.location.reload(); 
     /*messageLogs.splice(0, messageLogs.length);
     list_objects.splice(0, list_objects.length);
     document.getElementById("rooms_panel").style.display = "grid";
     document.getElementById("tools").style.display = "none";
     document.getElementById("room_title").innerHTML = '<p class="title" id="room_title">Hall</p>';
     document.getElementById("myCanvas").setAttribute("style","-webkit-filter: blur(2px);");
     document.getElementById("result").innerHTML = "";
     
     //tell the server that i go to hall
     var username =  document.getElementById("username_login").value;
      var msg = {
             type: "room",
             room: "hall",
             username: username,
             socketID: mySocketID
        };  
     socket.send(JSON.stringify(msg));*/
     
}
//list of all pointers in the Earth
var list_objects = [];
var objectID = 0;

//setup context for canvas
var canvas = document.querySelector("canvas");
var gl = GL.create({canvas: canvas});

gl.captureMouse();
gl.captureKeys();
gl.onmouse = onMouse;
//gl.onkeydown = onKey;

//scene container
var scene = new RD.Scene();

//var walk_area = new WalkArea();
//walk_area.addRect([-1.8,0.1,-0.8],5,5);

var CHARACTERS_LAYER = 4; //4 is 100 in binary

//EARTH
var sphere = new RD.SceneNode();
sphere.layers = 2;
sphere.mesh = "sphere";
//sphere.scale(0.05);
sphere.textures.color = "data/day_8k.jpg"
sphere.position = [0,1,0];
scene.root.addChild( sphere );


function GetOrthogonalVector(x,y) {
    var angle = Math.atan2(-y, -x);   //radians
    // you need to devide by PI, and MULTIPLY by 180:
    var degrees = 180*angle/Math.PI;  //degrees
    return degrees;//(360+Math.round(degrees))%360;
}
//addPointer in the given coords
function addPointer(x, y , z, id){
    
    var pointer = new RD.SceneNode();
    pointer.layers = 2;
    pointer.mesh = "data/pointer.obj";
    pointer.scale(0.05);
    pointer.textures.color = "data/red_texture.jpg"
    pointer.position = [x,y,z];
    pointer.name = id;
    pointer.orientTo([0,1,0]);
    
    console.log(x + " " + y + " " + z);
    pointer.rotate(100 , RD.LEFT); //it accepts a vector
    scene.root.addChild( pointer );
    
    //add pointer to the list
    var obj = {
        x: x,
        y: y,
        z: z,
        id: id,
        obj_type: "pointer"
    };
    list_objects.push(obj); 
    objectID++;
}

function addPlane(x, y , z, id, isRed){
    
    var plane = new RD.SceneNode();
    plane.layers = 2;
    plane.mesh = "data/plane3.obj";
    plane.scale(0.002);
    if(isRed) plane.textures.color = "data/red_texture.jpg";
    else plane.textures.color = "data/green_texture.jpg";
    plane.position = [x,y,z];
    plane.name = id;
    plane.orientTo([0,1,0]);
    plane.rotate(1.2 , RD.FRONT);
    plane.rotate(80 , RD.LEFT);    
    
    scene.root.addChild( plane );
    
    //add plane to the list
    var obj = {
        x: x,
        y: y,
        z: z,
        id: id,
        obj_type: " "
    };
    //check color of plane
    if(isRed) obj.obj_type = "redPlane";
    else obj.obj_type = "greenPlane";
    
    list_objects.push(obj); 
    objectID++;
}

//find nearest pointer having x,y and z
function findPointer(x,y){
    //rectangle to check if pointer is insde
    var x1 = x - 0.05;
    var x2 = x + 0.05;
    var y1 = y - 0.05;
    var y2 = y + 0.05;
    var id = -1;
    for(i = 0; i< list_objects.length; i++){
        if((list_objects[i].x > x1 && list_objects[i].x < x2) && (list_objects[i].y > y1 && list_objects[i].y < y2)){
            id = list_objects[i].id;
        }        
    }
    return id;
}

//remove pointer from list
function removePointer(id){
    for(i = 0; i< list_objects.length; i++){
        if(list_objects[i].id == id){
            list_objects.splice(i,1);
        }        
    }
}


//camera
var camera = new RD.Camera();
camera.lookAt([0,1,4],[0,1,0],[0,1.5,0]);
camera.fov = 60;

//renderer of the scene
var renderer = new RD.Renderer(gl);

//we need an skeletonm if we plan to do blending
var skeleton = new RD.Skeleton(); //skeleton for blending

//draws the whole frame
function draw()
{
        canvas.width = window.innerWidth*403/617;
        canvas.height = window.innerHeight - 85;
        camera.perspective(camera.fov,canvas.width / canvas.height,0.1,1000); //to render in perspective mode

        //clear
        gl.viewport( 0, 0, canvas.width, canvas.height );
        gl.clearColor( 0,0,0,1 );
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

        drawWorld( camera );
}

//draws the world from a camera point of view
function drawWorld( camera )
{
        renderer.render( scene, camera );

        //render gizmos
        //areas
        //var vertices = walk_area.getVertices();
        //if(vertices)
        //      renderer.renderPoints(vertices,null,camera,null,null,0.1,gl.LINES);

        /*
        gl.disable( gl.DEPTH_TEST );
        if(character.skeleton)
        {
                var vertices = character.skeleton.getVertices( character.getGlobalMatrix() );
                if(vertices)
                        renderer.renderPoints(vertices,null,camera,null,null,0.1,gl.LINES);
                gl.enable( gl.DEPTH_TEST );
        }
        */
}

//CONTROLLER
function update(dt)
{
        var t = getTime() * 0.001;

        //example of how to blend two animations
        //animations.idle.assignTime( t, true );
        //animations.walking.assignTime( t, true );
        //RD.Skeleton.blend( animations.idle, animations.walking, 0.5, skeleton );


        //input       
        var delta = [0,0,0];
        if( gl.keys["W"] ){
            delta[2] = -1;
            if (camera.fov < 170 )camera.fov += 0.5;
        }else if( gl.keys["S"] ){
            delta[2] = 1;
            if (camera.fov > 6 )camera.fov -= 0.5;
        }if( gl.keys["A"] )
            delta[0] = -1;
        else if( gl.keys["D"] )
            delta[0] = 1;
        //camera.moveLocal(delta,dt * 10);

        //example of ray test from the character with the environment (layer 0b1)
        if(0)
        {
                var center = character.localToGlobal([0,70,0]);
                var forward = character.getLocalVector([0,0,1]);
                vec3.normalize( forward, forward );
                var ray = new GL.Ray(center,forward);
                var coll_node = scene.testRay( ray,null,100,1 );
                if(coll_node)
                        sphere.position = ray.collision_point;
        }

        //example of placing object in head of character
        /*if(0 && character.skeleton)
        {
                var head_matrix = character.skeleton.getBoneMatrix("mixamorig_Head", true);
                var gm = character.getGlobalMatrix();
                var m = mat4.create();
                mat4.multiply( m, gm, head_matrix );
                mat4.scale( m, m, [20,20,20]);
                sphere.fromMatrix( m );
        }*/

}


function onMouse(e)
{
        //console.log(e.type);

        if(e.type == "mousedown")
        {
                var ray = camera.getRay( e.canvasx, e.canvasy );
                var coll_node = scene.testRay(ray);
                if(coll_node)
                {
                        //console.log(coll_node.name, ray.collision_point);
                        if(tool == "pointer"){
                            var id = mySocketID + "/"+ objectID;
                            addPointer(ray.collision_point[0], ray.collision_point[1],ray.collision_point[2], id);
                            //broadcast the pointer to the other users in the room
                            var pointer_msg = {
                                type: "pointer",
                                x: ray.collision_point[0],
                                y: ray.collision_point[1],
                                z: ray.collision_point[2],
                                mySocketID: mySocketID,
                                pointerName: id
                            };   
                            socket.send(JSON.stringify(pointer_msg));
                            tool = "move";
                            
                        }else if(tool == "remove"){
                            var id = findPointer(ray.collision_point[0], ray.collision_point[1]);
                            console.log("clicked pointer has id = " + id);
                            removePointer(id);
                            var child_node = scene.root.findNodeByName( id );
                            if(id != -1){ 
                                scene.root.removeChild( child_node );
                            
                                var remove_msg = {
                                    type: "remove",
                                    mySocketID: mySocketID,
                                    pointerName: id
                                };   
                                socket.send(JSON.stringify(remove_msg));
                            }
                            tool = "move";
                            
                        }else if(tool == "redPlane"){
                            var id = mySocketID + "/"+ objectID;
                            var z = 0;
                            if(ray.collision_point[2] > 0){
                                z = ray.collision_point[2] + 0.03;
                            }else{
                                z = ray.collision_point[2] - 0.03;
                            }
                            addPlane(ray.collision_point[0], ray.collision_point[1],z, id, true);
                            var pointer_msg = {
                                type: "redPlane",
                                x: ray.collision_point[0],
                                y: ray.collision_point[1],
                                z: z,
                                mySocketID: mySocketID,
                                pointerName: id
                            };   
                            socket.send(JSON.stringify(pointer_msg));
                            tool = "move";
                            
                        }else if(tool == "greenPlane"){
                            var id = mySocketID + "/"+ objectID;
                            var z = 0;
                            if(ray.collision_point[2] > 0){
                                z = ray.collision_point[2] + 0.03;
                            }else{
                                z = ray.collision_point[2] - 0.03;
                            }
                            addPlane(ray.collision_point[0], ray.collision_point[1],z, id, false);
                            var pointer_msg = {
                                type: "greenPlane",
                                x: ray.collision_point[0],
                                y: ray.collision_point[1],
                                z: z,
                                mySocketID: mySocketID,
                                pointerName: id
                            };   
                            socket.send(JSON.stringify(pointer_msg));
                            tool = "move";
                        }
                }
        }

        if(e.dragging)
        {
                //orbit around Earth
                camera.orbit(-e.deltax * 0.001 * Math.log(camera.fov), [0,1,0] );
                var right = camera.getLocalVector([1,0,0]);
                camera.orbit(-e.deltay * 0.001 * Math.log(camera.fov), right);
        }

}
/*
function onKey(e)
{
        //console.log(e);
        if(e.key == "Tab")
        {
                freecam = !freecam;
                e.preventDefault();
                e.stopPropagation();
                return true;
        }
        else if(e.code == "Space")
                character.dance = !character.dance;
}*/


//last stores timestamp from previous frame
var last = performance.now();

function loop()
{
   draw();


   //to compute seconds since last loop
   var now = performance.now();
   //compute difference and convert to seconds
   var elapsed_time = (now - last) / 1000; 
   //store current time into last time
   last = now;

   //now we can execute our update method
   update( elapsed_time );

   //request to call loop() again before next frame
   requestAnimationFrame( loop );
}


function init()
{
        //start loop
        loop();
}

init();
