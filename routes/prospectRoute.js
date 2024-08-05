const express = require("express");

const {
  createProspect,
  createBulkProspect,
  getProspect,
  updateProspect,
  getAllProspect,
  startCalling,
  freshCalling,
  overDueCalling,
  prospectWiseReport,
  getAgentWiseStates,
} = require("../controllers/prospectController");
const upload = require("../middleware/upload");

const router = express.Router();

router.route("/add_prospect").post(createProspect);
router.post(
  "/add_bulk_prospect",
  upload.single("prospects"),
  createBulkProspect
);
router.route("/get_all_prospects").get(getAllProspect);
router.route("/get_prospect/:id").get(getProspect);
router.route("/update_prospect/:id").put(updateProspect);
router.route("/start_calling").get(startCalling);
router.route("/fresh_calling").get(freshCalling);
router.route("/overdue_call").get(overDueCalling);
router.route("/report_prospects_wise").get(prospectWiseReport);
router.route("/report_prospects_wise/:agentId").get(getAgentWiseStates);
// router.route("/delete_prospect/:id").delete(deleteProspect);
module.exports = router;
