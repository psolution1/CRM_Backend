const Prospect = require("../models/prospectsModel");
const responseObject = require("../utils/apiResponse");
const { rootPath } = require("../app");

var XLSX = require("xlsx");
const callLogModel = require("../models/callLogModel");
const agentModel = require("../models/agentModel");
const CampaignModel = require("../models/campaignModel");
console.log("rootPath", __dirname, __dirname + "/../");

exports.createProspect = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return responseObject({
        res,
        status: 400,
        type: "error",
        message: "Name is required",
      });
    }
    const isProspectExist = await Prospect.findOne({ name });
    if (isProspectExist) {
      return responseObject({
        res,
        status: 400,
        type: "error",
        message: "Prospect Already Exist",
        data: null,
        error: null,
      });
    }
    const prospect = await Prospect.create(req.body);
    responseObject({
      res,
      status: 201,
      type: "success",
      message: "Prospect Added Successfully....",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Create prospect", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.createBulkProspect = async (req, res, next) => {
  try {
    console.log(req.file.fieldname);

    const wb = XLSX.readFile(
      __dirname.replace("controllers", "") + req.file.path
    );
    // console.log(wb.Sheets["Sheet1"]);
    var prospectArr = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], {});
    // console.log(prospectArr);
    // if (prospects.length === 0) {
    //   return responseObject({
    //     res,
    //     status: 400,
    //     type: "error",
    //     message: "Prospects are required",
    //   });
    // }
    const agents = await agentModel.find({ agent_status: 1 });
    const campaign = await CampaignModel.findOne({
      IsActive: true,
    })
      .sort({ createdAt: -1 })
      .select("name");
    console.log("campaignName", campaign);
    const prospectPerAgent = Math.ceil(prospectArr.length / agents.length);
    let prospect = [];
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const agentProspects = prospectArr.splice(0, prospectPerAgent);
      const assignAgentToProspect = agentProspects.map((prospect) => {
        return {
          ...prospect,
          assignPhone: agent.agent_mobile,
          assignTo: agent.agent_email,
          agent: agent._id,
          campaignName: campaign.name,
          campaignId: campaign._id,
          totalCalls: 0,
          lastCallDate: new Date(),
        };
      });
      // console.log("assignAgentToProspect", assignAgentToProspect);
      const prospectData = await Prospect.insertMany(assignAgentToProspect, {
        ordered: false,
      });
      // console.log("---------------------------------");
      console.log("prospectData", prospectData);
      prospect = [...prospect, ...prospectData];
    }

    // const prospect = await Prospect.insertMany(prospectArr, {
    //   ordered: false,
    // });

    console.log("prospect", prospect);

    responseObject({
      res,
      status: 201,
      type: "success",
      message: "Prospects Added Successfully....",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Create bulk prospect", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.getAllProspect = async (req, res, next) => {
  try {
    const prospects = await Prospect.find({});
    responseObject({
      res,
      status: 200,
      type: "success",

      message: "your prospects",
      data: prospects,
      error: null,
    });
  } catch (err) {
    console.log("Get prospects", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const prospects = await Prospect.find({});
    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospects",
      data: prospects,
      error: null,
    });
  } catch (err) {
    console.log("Get prospects", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.getProspect = async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return responseObject({
        res,
        status: 400,
        type: "error",
        message: "Prospect Not Found",
        data: null,
        error: null,
      });
    }
    responseObject({
      res,
      status: 201,
      type: "success",
      message: "your prospect",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Get prospect", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.updateProspect = async (req, res, next) => {
  try {
    const prospectId = req.params.id;
    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return responseObject({
        res,
        status: 400,
        type: "error",
        message: "Prospect Not Found",
        data: null,
        error: null,
      });
    }
    const {
      remarks,
      lastCaller,
      phone_number,
      scheduledDate,
      callInitiatedTime,
      callEndTime,
      duration,
      disposition,
      quit = false,
      agentEmail,
    } = req.body;
    prospect.remarks = remarks;
    prospect.lastCaller = lastCaller;
    prospect.lastCallDate = new Date();
    prospect.totalCalls = prospect.totalCalls + 1;
    prospect.scheduledDate = scheduledDate;
    prospect.disposition = disposition;

    const newCallLogs = new callLogModel({
      user_id: prospect._id,
      agentEmail,
      agent_id: prospect.agent,
      callInitiatedTime,
      callEndTime,
      duration,
      phone_number,
      callStatus: disposition,
    });

    prospect.callLogId = newCallLogs._id;
    await newCallLogs.save();
    await prospect.save();

    if (!quit) {
      const newProspect = await Prospect.findOne({
        assignTo: agentEmail,
        totalCalls: 0,
      });
      console.log("newProspect", newProspect, agentEmail);
      return responseObject({
        res,
        status: 200,
        type: "success",
        message: "your prospect",
        data: newProspect,
        error: null,
      });
    }

    responseObject({
      res,
      status: 201,
      type: "success",
      message: "your prospect",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Update prospect", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.startCalling = async (req, res, next) => {
  try {
    const agent = req.query.agentEmail;
    const campaignId = req.query.campaignId;
    const prospect = await Prospect.findOne({
      $and: [{ assignTo: agent }, { campaignId }, { totalCalls: 0 }],
    }).sort("lastCallDate");

    console.log("prospect", prospect);
    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospect",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Start Calling", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.freshCalling = async (req, res, next) => {
  try {
    const agent = req.query.agentEmail;
    const campaignId = req.query.campaignId;
    const prospect = await Prospect.findOne({
      $and: [{ assignTo: agent }, { campaignId }, { totalCalls: 0 }],
    }).skip(1);

    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospect",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Start Calling", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.overDueCalling = async (req, res, next) => {
  try {
    const agent = req.query.agentEmail;
    const campaignId = req.query.campaignId;
    const prospect = await Prospect.findOne({
      $and: [
        { assignTo: agent },
        { campaignId },
        {
          scheduledDate: {
            $lt: new Date(),
          },
        },
      ],
    }).sort("scheduledDate");

    console.log("prospect over due", prospect);

    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospect",
      data: prospect,
      error: null,
    });
  } catch (err) {
    console.log("Over due Calling", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.prospectWiseReport = async (req, res, next) => {
  try {
    const reportPwise = await Prospect.aggregate([
      {
        $facet: {
          agentWise: [
            {
              $match: {
                disposition: {
                  $ne: "Lead Generation",
                },
              },
            },
            {
              $group: {
                _id: "$agent",
                assignTo: {
                  $first: "$assignTo",
                },
                assignPhone: {
                  $first: "$assignPhone",
                },
                totalCount: {
                  $sum: 1,
                },
              },
            },
          ],

          campaignWise: [
            {
              $group: {
                _id: "campaignId",
                campaignName: {
                  $first: "$campaignName",
                },
                totalCount: {
                  $sum: 1,
                },
              },
            },
          ],

          totalNotInterested: [
            {
              $match: {
                disposition: "Not Interested",
              },
            },
            { $count: "count" },
          ],
          totalInterested: [
            { $match: { disposition: "Interested" } },
            { $count: "count" },
          ],
          totalNotContacted: [
            {
              $match: { disposition: "Not Contacted" },
            },
            { $count: "count" },
          ],
          totalNotAnswered: [
            {
              $match: { disposition: "Not Answered" },
            },
            { $count: "count" },
          ],
          totalCallback: [
            { $match: { disposition: "Callback" } },
            { $count: "count" },
          ],
          totalNotReachable: [
            {
              $match: { disposition: "Not Reachable" },
            },
            { $count: "count" },
          ],
          totalCallDisconnected: [
            {
              $match: {
                disposition: "Call Disconnected",
              },
            },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          agentWise: 1,
          campaignWise: 1,
          totalNotInterested: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalNotInterested.count", 0],
              },
              0,
            ],
          },
          totalInterested: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalInterested.count", 0],
              },
              0,
            ],
          },
          totalNotContacted: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalNotContacted.count", 0],
              },
              0,
            ],
          },
          totalNotAnswered: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalNotAnswered.count", 0],
              },
              0,
            ],
          },
          totalCallback: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalCallback.count", 0],
              },
              0,
            ],
          },
          totalNotReachable: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalNotReachable.count", 0],
              },
              0,
            ],
          },
          totalCallDisconnected: {
            $ifNull: [
              {
                $arrayElemAt: ["$totalCallDisconnected.count", 0],
              },
              0,
            ],
          },
        },
      },
    ]);

    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospect",
      data: reportPwise.length > 0 ? reportPwise[0] : null,
      error: null,
    });
  } catch (err) {
    console.log("Over due Calling", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};

exports.getAgentWiseStates = async (req, res, next) => {
  try {
    const prospects = await Prospect.aggregate([
      {
        $match: {
          assignTo: req.params.agentId,
        },
      },
      {
        $facet: {
          totalNotInterested: [
            {
              $match: {
                disposition: "Not Interested",
              },
            },
            {
              $count: "count",
            },
          ],
          totalInterested: [
            {
              $match: {
                disposition: "Interested",
              },
            },
            {
              $count: "count",
            },
          ],
          totalNotContacted: [
            {
              $match: {
                disposition: "Not Contacted",
              },
            },
            {
              $count: "count",
            },
          ],
          totalNotAnswered: [
            {
              $match: {
                disposition: "Not Answered",
              },
            },
            {
              $count: "count",
            },
          ],
          totalCallback: [
            {
              $match: {
                disposition: "Callback",
              },
            },
            {
              $count: "count",
            },
          ],
          totalNotReachable: [
            {
              $match: {
                disposition: "Not Reachable",
              },
            },
            {
              $count: "count",
            },
          ],
          totalCallDisconnected: [
            {
              $match: {
                disposition: "Call Disconnected",
              },
            },
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          totalNotInterested: {
            $ifNull: [{ $arrayElemAt: ["$totalNotInterested.count", 0] }, 0],
          },
          totalInterested: {
            $ifNull: [{ $arrayElemAt: ["$totalInterested.count", 0] }, 0],
          },
          totalNotContacted: {
            $ifNull: [{ $arrayElemAt: ["$totalNotContacted.count", 0] }, 0],
          },
          totalNotAnswered: {
            $ifNull: [{ $arrayElemAt: ["$totalNotAnswered.count", 0] }, 0],
          },
          totalCallback: {
            $ifNull: [{ $arrayElemAt: ["$totalCallback.count", 0] }, 0],
          },
          totalNotReachable: {
            $ifNull: [{ $arrayElemAt: ["$totalNotReachable.count", 0] }, 0],
          },
          totalCallDisconnected: {
            $ifNull: [{ $arrayElemAt: ["$totalCallDisconnected.count", 0] }, 0],
          },
        },
      },
    ]);
    responseObject({
      res,
      status: 200,
      type: "success",
      message: "your prospects",
      data: prospects.length > 0 ? prospects[0] : null,
      error: null,
    });
  } catch (err) {
    console.log("Get prospects", err);
    responseObject({
      res,
      status: 500,
      type: "error",
      message: "server error",
      error: err,
      data: null,
    });
  }
};
