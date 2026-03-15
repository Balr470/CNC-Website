const express = require('express');
const designController = require('../controllers/design.controller');
const { protect } = require('../middlewares/auth.middleware');
const { restrictToAdmin } = require('../middlewares/admin.middleware');
const { uploadLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

const { upload } = require('../middlewares/multer.middleware');

router.route('/')
    .get(designController.getAllDesigns)
    .post(
        protect,
        restrictToAdmin,
        uploadLimiter,
        upload.fields([
            { name: "preview", maxCount: 1 },
            { name: "cnc", maxCount: 1 }
        ]),
        designController.createDesign
    );

router.route('/:id')
    .get(designController.getDesign)
    .put(protect, restrictToAdmin, designController.updateDesign)
    .delete(protect, restrictToAdmin, designController.deleteDesign);

// Permanent delete route - removes from storage AND database
router.delete('/:id/permanent', protect, restrictToAdmin, designController.permanentDeleteDesign);

router.get('/:id/related', designController.getRelatedDesigns);

module.exports = router;
