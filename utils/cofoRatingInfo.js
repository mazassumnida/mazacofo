const cofoRatingInfo = module.exports = {};
cofoRatingInfo.TIER_COLOR = {
    newbie: "#CBCBCB",
    pupil: "#32D336",
    specialist: "#00D9CC",
    expert: "#656AFF",
    'candidate master': "#EE00EE",
    master: "#FF8C00",
    'international master': "#FF8C00",
    grandmaster: "#FC1212",
    'international grandmaster': "#FC1212",
    'legendary grandmaster': "#FC1212"
};

cofoRatingInfo.RANK_EXP = {
    newbie: {
        displayName: "Newbie",
        min: 0,
        max: 1199
    },
    pupil: {
        displayName: "Pupil",
        min: 1200,
        max: 1399
    },
    specialist: {
        displayName: "Specialist",
        min: 1400,
        max: 1599
    },
    expert: {
        displayName: "Expert",
        min: 1600,
        max: 1899
    },
    'candidate master': {
        displayName: "Candidate Master",
        min: 1900,
        max: 2099
    },
    master: {
        displayName: "Master",
        min: 2100,
        max: 2299
    },
    'international master': {
        displayName: "International Master",
        min: 2300,
        max: 2399
    },
    grandmaster: {
        displayName: "Grandmaster",
        min: 2400,
        max: 2599
    },
    'international grandmaster': {
        displayName: "International Grandmaster",
        min: 2600,
        max: 2999
    },
    'legendary grandmaster': {
        displayName: "Legendary Grandmaster",
        min: 3000,
        max: 5000
    }
};