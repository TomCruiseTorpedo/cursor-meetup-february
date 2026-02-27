/* global AFRAME */

(function () {
  var PASSES = 3;
  var ZONE_IDS = ['zone-1', 'zone-2', 'zone-3'];
  var PLACEMENT_DISTANCE = 0.22;
  var FEEDBACK_DURATION_MS = 1200;

  var STEP_LABELS = {
    pick_needle: 'STEP 1: Pick up the needle. Point at it, click and HOLD.',
    pass_1_approach: 'STEP 2: Drag the needle to the GREEN CIRCLE marked 1.',
    pass_1_release: 'STEP 3: Put needle in the circle, then RELEASE the mouse.',
    pass_2_approach: 'STEP 4: Drag the needle to the GREEN CIRCLE marked 2.',
    pass_2_release: 'STEP 5: Put needle in the circle, then RELEASE the mouse.',
    pass_3_approach: 'STEP 6: Drag the needle to the GREEN CIRCLE marked 3.',
    pass_3_release: 'STEP 7: Put needle in the circle, then RELEASE to finish!',
    complete: 'DONE! Suture complete.'
  };

  var STEP_NUMS = {
    pick_needle: '1 of 7',
    pass_1_approach: '2 of 7',
    pass_1_release: '3 of 7',
    pass_2_approach: '4 of 7',
    pass_2_release: '5 of 7',
    pass_3_approach: '6 of 7',
    pass_3_release: '7 of 7',
    complete: 'Done!'
  };

  AFRAME.registerComponent('surgical-guide', {
    schema: {
      needleId: { default: 'needle' },
      needleTipId: { default: 'needle-point' },
      anatomyId: { default: 'anatomy' },
      promptEntityId: { default: 'step-prompt' },
      counterEntityId: { default: 'step-counter' },
      releaseZoneId: { default: 'release-zone' }
    },

    init: function () {
      this.currentPass = 0;
      this.state = 'pick_needle';
      this.grabbedEl = null;
      this.feedbackTimeout = null;
      this.busy = false;
      this.boundOnGrabStarted = this.onGrabStarted.bind(this);
      this.boundOnGrabEnded = this.onGrabEnded.bind(this);

      var sceneEl = this.el;
      sceneEl.addEventListener('grabstarted', this.boundOnGrabStarted);
      sceneEl.addEventListener('grabended', this.boundOnGrabEnded);

      var self = this;
      if (sceneEl.hasLoaded) {
        self.transitionTo('pick_needle');
      } else {
        sceneEl.addEventListener('loaded', function () {
          self.transitionTo('pick_needle');
        });
      }
    },

    remove: function () {
      this.el.removeEventListener('grabstarted', this.boundOnGrabStarted);
      this.el.removeEventListener('grabended', this.boundOnGrabEnded);
      if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    },

    tick: function () {
      if (this.grabbedEl && this.state.indexOf('approach') !== -1) {
        this.checkZoneProximity();
      }
      if (this.state.indexOf('release') !== -1 || this.state.indexOf('approach') !== -1) {
        this.updateReleaseZoneHighlight();
      }
    },

    onGrabStarted: function (evt) {
      this.grabbedEl = (evt.detail && evt.detail.grabbedEl) || evt.target;
      var id = this.grabbedEl && this.grabbedEl.id;

      if (id === this.data.needleId && this.state === 'pick_needle') {
        this.transitionTo('pass_1_approach');
      }
    },

    onGrabEnded: function (evt) {
      var releasedEl = (evt.detail && evt.detail.grabbedEl) || evt.target;

      if (!this.busy && releasedEl && releasedEl.id === this.data.needleId) {
        var zoneId = ZONE_IDS[this.currentPass];
        var zoneEl = document.getElementById(zoneId);
        var inZone = zoneEl && this.isNeedleTipNearZone(releasedEl, zoneEl);

        if (inZone) {
          if (this.state === 'pass_1_release' || this.state === 'pass_1_approach') {
            this.completePass(1);
          } else if (this.state === 'pass_2_release' || this.state === 'pass_2_approach') {
            this.completePass(2);
          } else if (this.state === 'pass_3_release' || this.state === 'pass_3_approach') {
            this.completePass(3);
          }
        }
      }

      if (releasedEl === this.grabbedEl) {
        this.grabbedEl = null;
      }
    },

    checkZoneProximity: function () {
      var zoneId = ZONE_IDS[this.currentPass];
      var zoneEl = document.getElementById(zoneId);
      if (!zoneEl || !this.grabbedEl) return;
      if (this.isNeedleTipNearZone(this.grabbedEl, zoneEl)) {
        var approachState = 'pass_' + (this.currentPass + 1) + '_approach';
        var releaseState = 'pass_' + (this.currentPass + 1) + '_release';
        if (this.state === approachState) {
          this.transitionTo(releaseState);
        }
      }
    },

    getNeedleTipPosition: function (needleEl) {
      var tipEl = needleEl.querySelector('#' + this.data.needleTipId) || needleEl.querySelector('[id="needle-point"]');
      var THREE = AFRAME.THREE;
      var pos = new THREE.Vector3();
      if (tipEl) {
        tipEl.object3D.getWorldPosition(pos);
      } else {
        needleEl.object3D.getWorldPosition(pos);
      }
      return pos;
    },

    isNeedleTipNearZone: function (needleEl, zoneEl) {
      var THREE = AFRAME.THREE;
      var tipPos = this.getNeedleTipPosition(needleEl);
      var zonePos = new THREE.Vector3();
      zoneEl.object3D.getWorldPosition(zonePos);
      return tipPos.distanceTo(zonePos) < PLACEMENT_DISTANCE;
    },

    completePass: function (passNum) {
      if (this.busy) return;
      this.busy = true;
      this.playSuccessSound();
      this.highlightZone(ZONE_IDS[this.currentPass]);
      this.updatePromptForFeedback();

      var self = this;
      this.feedbackTimeout = setTimeout(function () {
        self.busy = false;
        if (passNum >= PASSES) {
          self.transitionTo('complete');
        } else {
          self.currentPass = passNum;
          self.transitionTo('pass_' + (passNum + 1) + '_approach');
        }
      }, FEEDBACK_DURATION_MS);
    },

    transitionTo: function (newState) {
      this.state = newState;
      this.updatePrompt();
      this.updateStepCounter();
      this.updateZoneVisibility();
      this.hideReleaseZone();
      this.el.emit('surgical-step-changed', { state: newState });
    },

    updatePrompt: function () {
      var promptEl = document.getElementById(this.data.promptEntityId);
      if (promptEl) {
        promptEl.setAttribute('text', 'value', STEP_LABELS[this.state] || '');
      }
    },

    updateStepCounter: function () {
      var counterEl = document.getElementById(this.data.counterEntityId);
      if (counterEl) {
        counterEl.setAttribute('text', 'value', STEP_NUMS[this.state] || '');
      }
    },

    updatePromptForFeedback: function () {
      var promptEl = document.getElementById(this.data.promptEntityId);
      if (promptEl) {
        promptEl.setAttribute('text', 'value', 'Pass ' + (this.currentPass + 1) + ' done!');
      }
    },

    updateZoneVisibility: function () {
      var showZones = this.state.indexOf('approach') !== -1 || this.state.indexOf('release') !== -1;
      for (var i = 0; i < ZONE_IDS.length; i++) {
        var zoneEl = document.getElementById(ZONE_IDS[i]);
        if (zoneEl) {
          zoneEl.setAttribute('visible', showZones && i === this.currentPass);
        }
      }
    },

    updateReleaseZoneHighlight: function () {
      var zoneId = ZONE_IDS[this.currentPass];
      var zoneEl = document.getElementById(zoneId);
      var needleEl = document.getElementById(this.data.needleId);
      var releaseZoneEl = document.getElementById(this.data.releaseZoneId);
      if (!zoneEl || !needleEl || !releaseZoneEl) return;

      var near = this.isNeedleTipNearZone(needleEl, zoneEl);
      releaseZoneEl.setAttribute('visible', near);

      var needlePoint = needleEl.querySelector('#' + this.data.needleTipId) || needleEl.querySelector('[id="needle-point"]');
      if (needlePoint) {
        needlePoint.setAttribute('color', near ? '#00FF00' : '#E8E8E8');
      }
    },

    hideReleaseZone: function () {
      var releaseZoneEl = document.getElementById(this.data.releaseZoneId);
      var needleEl = document.getElementById(this.data.needleId);
      if (releaseZoneEl) releaseZoneEl.setAttribute('visible', false);
      if (needleEl) {
        var needlePoint = needleEl.querySelector('[id="needle-point"]');
        if (needlePoint) needlePoint.setAttribute('color', '#E8E8E8');
      }
    },

    highlightZone: function (zoneId) {
      var zoneEl = document.getElementById(zoneId);
      if (zoneEl) {
        var ring = zoneEl.querySelector('a-torus');
        if (ring) {
          ring.setAttribute('color', '#00FF00');
          var self = this;
          setTimeout(function () {
            ring.setAttribute('color', '#00CC00');
          }, FEEDBACK_DURATION_MS);
        }
      }
    },

    playSuccessSound: function () {
      var audioContext = this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)();
      var osc = audioContext.createOscillator();
      var gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.15);
    }
  });
})();
