//1
renderer = new THREE.SVGRenderer();
renderer.setClearColor(0x000000);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 35;
var scene = new THREE.Scene();

//3.1. Controls
var controls = new THREE.OrbitControls(camera, renderer.domElement);
//3.2 GUI
var options = {
  Rotation: false
};

var gui = new dat.GUI();
var f = gui.addFolder('Movement');
f.open();
f.add(options, 'Rotation');

var ambient = new THREE.AmbientLight(0x80ffff);
scene.add(ambient);
var directional = new THREE.DirectionalLight(0xffff00);
directional.position.set(-1, 0.5, 0);
scene.add(directional);

//4. Geometric Obj
var geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
var material = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  wireframe: true
});
var torusKnot = new THREE.Mesh(geometry, material);
scene.add(torusKnot);

//To start the infinite loop
function render() {
  requestAnimationFrame(render);
  if (options.Rotation) {
    animateGeom();
  }
  renderer.render(scene, camera);
}

render();

function animateGeom() {
  torusKnot.rotation.x += 0.01;
  torusKnot.rotation.y += 0.01;
};

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

}, false);