/* global AFRAME */
/**
 * Minimal desktop drag - click and drag grabbable objects with mouse/trackpad.
 * No external dependencies. Emits grabstarted/grabended for surgical-guide compatibility.
 */
(function () {
  AFRAME.registerComponent('desktop-drag', {
    init: function () {
      var THREE = AFRAME.THREE;
      this.grabbedEl = null;
      this.originalParent = null;
      this.mouse = new THREE.Vector2(0.5, 0.5);
      this.intersectPoint = new THREE.Vector3();
      this.plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
      this.planeNormal = new THREE.Vector3(0, 0, -1);
      this.cameraWorldPos = new THREE.Vector3();
      this.raycaster = new THREE.Raycaster();
      this.planePoint = new THREE.Vector3();
      this.tempVec = new THREE.Vector3();

      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);

      var sceneEl = this.el.sceneEl;
      sceneEl.addEventListener('loaded', this.setup.bind(this));
    },

    setup: function () {
      var sceneEl = this.el.sceneEl;
      this.canvas = sceneEl.canvas;
      if (!this.canvas) return;
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('mousedown', this.onMouseDown);
      document.addEventListener('mouseup', this.onMouseUp);
    },

    remove: function () {
      if (this.canvas) {
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
      }
      document.removeEventListener('mouseup', this.onMouseUp);
    },

    onMouseMove: function (evt) {
      var rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    },

    onMouseDown: function () {
      if (this.grabbedEl) return;
      var el = this.getIntersectedDraggable();
      if (!el) return;
      this.grabbedEl = el;
      this.originalParent = el.object3D.parent;
      el.emit('grabstarted', { grabbedEl: el });
    },

    onMouseUp: function () {
      if (!this.grabbedEl) return;
      var el = this.grabbedEl;
      this.grabbedEl = null;
      el.emit('grabended', { grabbedEl: el });
    },

    getIntersectedDraggable: function () {
      var sceneEl = this.el.sceneEl;
      var camera = sceneEl.camera;
      var raycaster = this.el.components.raycaster;
      if (!raycaster || !camera) return null;
      raycaster.raycaster.setFromCamera(this.mouse, camera);
      var draggables = sceneEl.querySelectorAll('.draggable');
      var objects = [];
      for (var i = 0; i < draggables.length; i++) {
        draggables[i].object3D.traverse(function (o) {
          if (o.geometry) objects.push(o);
        });
      }
      var hits = raycaster.raycaster.intersectObjects(objects, true);
      if (hits.length === 0) return null;
      return this.getDraggableParent(hits[0].object);
    },

    getDraggableParent: function (obj) {
      while (obj) {
        var el = obj.el;
        if (el && el.classList && el.classList.contains('draggable')) return el;
        obj = obj.parent;
      }
      return null;
    },

    updateGrabbedPosition: function () {
      if (!this.grabbedEl || !this.originalParent) return;
      var sceneEl = this.el.sceneEl;
      var camera = sceneEl.camera;
      this.raycaster.setFromCamera(this.mouse, camera);
      this.planeNormal.set(0, 0, -1);
      this.planePoint.set(0, 0.55, -1.15);
      this.plane.setFromNormalAndCoplanarPoint(this.planeNormal, this.planePoint);
      if (this.raycaster.ray.intersectPlane(this.plane, this.intersectPoint)) {
        this.grabbedEl.object3D.position.copy(this.originalParent.worldToLocal(this.intersectPoint.clone()));
      }
    },

    tick: function () {
      if (this.grabbedEl) this.updateGrabbedPosition();
    }
  });
})();
