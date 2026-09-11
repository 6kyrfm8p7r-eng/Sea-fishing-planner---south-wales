(() => {

  "use strict";


  function normaliseCollectorReport(
    report
  ) {

    if (!report) {

      return null;

    }


    return {

      id:
        report.id || null,

      markId:
        report.markId || null,

      species:
        report.species || null,

      caught:
        report.caught === true,

      date:
        report.date || null,

      sourceId:
        report.sourceId || null,

      sourceType:
        report.sourceType || null,

      sourceName:
        report.sourceName || null,

      externalPostId:
        report.externalPostId || null,

      sourceUrl:
        report.sourceUrl || null,

      fingerprint:
        report.fingerprint || null,

      catchEventId:
        report.catchEventId || null,

      verified:
        report.verified === true,

      notes:
        report.notes || ""

    };

  }


   const CollectorContract = {

    normaliseCollectorReport

  };


  if (typeof window !== "undefined") {

    window.SeaPlannerCollectorContract =
      CollectorContract;

  }


  if (typeof module !== "undefined" &&
      module.exports) {

    module.exports =
      CollectorContract;

  }

})();
