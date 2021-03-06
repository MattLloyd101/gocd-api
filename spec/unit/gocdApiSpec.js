
var mockery = require('mockery');
var Q = require('q');
var ccTrayRequestorMock = require('./cc/ccTrayRequestorMock');
var gocdRequestorMock = require('./gocd/gocdRequestorMock');
var globalOptions = require('../../lib/options');

describe('gocd-api', function () {

  var gocdApi, ccTrayReader;

  beforeEach(function() {

    mockery.enable({
      warnOnUnregistered: false,
      warnOnReplace: false
    });

    globalOptions.getHistoryRequestor = function() {
      return gocdRequestorMock;
    };
    globalOptions.getCcTrayRequestor = function() {
      return ccTrayRequestorMock;
    };

    mockery.registerMock('../options', globalOptions);
    mockery.registerMock('./lib/options', globalOptions);

    ccTrayReader = require('../../lib/cc/ccTrayReader');
    gocdApi = require('../../index');

  });

  it('should return an instance that only provides cctray data', function (done) {
    var ccTrayInstance = gocdApi.getCcTrayInstance();
    expect(ccTrayInstance.readData).toBeUndefined();

    var filter = jasmine.createSpy('custom filter');
    spyOn(ccTrayReader, 'readActivity');
    ccTrayReader.readActivity.and.returnValue(new Q('cctray result'));

    ccTrayInstance.readActivity(['a', 'b'], filter).then(function (data) {
      expect(ccTrayReader.readActivity).toHaveBeenCalledWith(['a', 'b'], filter);
      expect(data).toEqual({
        pipeline: ['a', 'b'],
        activity: 'cctray result'
      });
      done();
    }).done();

  });

  it('should return activity data', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE').then(function (data) {
        expect(data.activity).toBeDefined();
        expect(data.activity.stages.length).toBe(6);
        done();
      }).done();
    });
  });

  it('should fill the initial cache for history data', function (testDone) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE').then(function (data) {
        var pipelineRuns = data.history.pipelineRuns;
        expect(pipelineRuns).toBeDefined();
        expect(pipelineRuns["2064"]).toBeDefined();// page 1
        expect(pipelineRuns["2063"]).toBeDefined();// page 3
        expect(pipelineRuns["2062"]).toBeDefined();// page 3
        // the others are currently building/scheduled
        expect(pipelineRuns["2065"]).toBeUndefined();// page 1
        expect(pipelineRuns["2066"]).toBeUndefined();// page 1
        testDone();
      }).done();
    }).done();
  });

  it('should read sample data for the downstream pipeline', function (done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('DOWNSTREAM-PIPELINE').then(function (data) {
        expect(data.activity).toBeDefined();
        expect(data.activity.stages.length).toBe(2);
        expect(data.history).toBeDefined();
        done();
      }).done();
    });
  });

  it("should exclude currently building pipelines", function(done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE').then(function (data) {
        expect(data.history['2066']).toBeUndefined();
        done();
      }).done();
    });
  });

  it("should fail gracefully if the pipeline is unknown", function(done) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE-NOT-KNOWN').fail(function (error) {
        expect(error).toContain("Pipeline unknown");
        done();
      }).done();
    });
  });

  it("should try to reload pipeline names if name is not cached", function(testDone) {
    gocdApi.getInstance().then(function(instance) {
      instance.readData('A-PIPELINE-NOT-KNOWN').fail(function () {
        gocdRequestorMock.getPipelineNames = function() {
          return Q.resolve(['A-PIPELINE', 'DOWNSTREAM-PIPELINE', 'A-PIPELINE-NOT-KNOWN']);
        };

        instance.readData('A-PIPELINE-NOT-KNOWN').then(function () {
          testDone();
        }).done();

      }).done();
    });
  });

  describe("should enrich activity data", function() {
    it("with author information from history", function(done) {
      gocdApi.getInstance().then(function(instance) {
        instance.readData('A-PIPELINE').then(function (data) {
          expect(data.activity.stages[4].initials).toBe("eno");
          done();
        }).done();
      });
    });

    it("with more accurate status of the stages", function(done) {
      gocdApi.getInstance().then(function(instance) {
        instance.readData('A-PIPELINE').then(function (data) {
          expect(data.activity.stages[1].gocdActivity).toBe('Building');
          expect(data.activity.stages[2].gocdActivity).toBe('Scheduled');
          done();
        }).done();
      });
    });

    it("with more accurate result of the stages", function(done) {
      gocdApi.getInstance().then(function(instance) {
        instance.readData('DOWNSTREAM-PIPELINE').then(function (data) {
          expect(data.activity.stages[1].lastBuildStatus).toBe("Cancelled");
          expect(data.activity.stages[1].info2).toContain("Cancelled");
          done();
        }).done();
      });
    });

  });

});
