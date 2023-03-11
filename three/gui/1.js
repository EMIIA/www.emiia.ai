function init() {

    const container = document.getElementById( 'container' );

    //

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( 0, 0, 200 );

    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );

    //

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.screenSpacePanning = true;
    
    controls.minDistance = 10;
    controls.maxDistance = 500;

    //

    window.addEventListener( 'resize', onWindowResize );

    guiData = {
        currentURL: './tiger.svg',
        drawFillShapes: true,
        drawStrokes: true,
        fillShapesWireframe: false,
        opened: false,
        strokesWireframe: false
    };
    
    guiData.opened = false;

    createGUI();

}
