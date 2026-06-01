'use strict';
const express = require('express');
const sessionsRouter = require('./sessions');
const eventsRouter = require('./events');
const diagnosticRouter = require('./diagnostic');
const communityRouter = require('./community');
const visionRouter = require('./vision');
const telemetryRouter = require('./telemetry');
const deviceMemoryRouter = require('./device-memory');
const offlineRouter = require('./offline');
const arRouter = require('./ar');
const ecosystemRouter = require('./ecosystem');
const configRouter = require('./config');
const devicesRouter = require('./devices');
const searchRouter = require('./search');
const feedbackRouter = require('./feedback');
const statsRouter = require('./stats');

const router = express.Router();

router.use('/', sessionsRouter);
router.use('/', eventsRouter);
router.use('/', diagnosticRouter);
router.use('/', communityRouter);
router.use('/', visionRouter);
router.use('/', telemetryRouter);
router.use('/', deviceMemoryRouter);
router.use('/', offlineRouter);
router.use('/', arRouter);
router.use('/', ecosystemRouter);
router.use('/', configRouter);
router.use('/', devicesRouter);
router.use('/', searchRouter);
router.use('/', feedbackRouter);
router.use('/', statsRouter);

module.exports = router;
