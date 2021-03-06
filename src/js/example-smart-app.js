(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var encounters=[];     
        var encounterLocations=[];
        var medicationStatement=[];
        var Immunizations=[];
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });
     

   smart.patient.api.fetchAll({type:"Encounter"}).then(function(results, refs) {
  results.forEach(function(encounter){
    if(encounter.reason!=null)
    {
      if(encounter.location!=null)
      {
        encounterLocations.push(encounter.location[0].location.display);
      }
     console.log('encounter locations: ',encounter.location);
      encounters.push(encounter.reason);
    }
  });
});
         smart.patient.api.fetchAll({type:"Immunization"}).then(function(results, refs) {
  results.forEach(function(im){
   Immunizations.push(im);
    return false;
  });
});
            
        
        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var patientAddress =patient.address;
          var encounterReasons="";
          $.each(encounters, function( index, value ) {
            encounterReasons+=value[0].text+"," ;
          });
          if(patientAddress!= null)
          {
            patientAddress =patientAddress[0].text; 
          }
          else
          {
            patientAddress ='NA'; 
          }
        
        //  var maritalStatus=patient.maritalStatus.text;
          var maritalStatus='N/A';
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');
         

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.height = getQuantityValueAndUnit(height[0]);
          p.patientAdd=patientAddress;
          p.maritalStatus=maritalStatus;
          p.encounterReasons=encounterReasons;
          p.encounterLocation=encounterLocations[0];
       //  if(Immunizations[0].date!=null)
            // {p.immuDate=Immunizations[0].date;
           //  }
        //  else
        //  {
            p.immuDate='N/A';
         // }  
          
          p.immuDosage=Immunizations[0].doseQuantity.value +Immunizations[0].doseQuantity.unit; 
          p.immuLocation =Immunizations[0].location.display;
          p.immuManufacturer=Immunizations[0].manufacturer.display;
          p.immuPerformer= Immunizations[0].performer.display;
          p.immuSite=Immunizations[0].site.text; 
        // p.msPName=medicationStatement[0].patient.display
         // p.msQuantity='N/A'
          //  p.msMedicationName=medicationStatement[0].medicationCodeableConcept.text;
        
          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      patientAdd: {value: ''},
      maritalStatus:{value: ''},
      encounterReasons:{value: ''},
       encounterLocation:{value: ''},
      immuDate :{value: ''},
      immuDosage :{value: ''},
      immuLocation :{value: ''},
      immuManufacturer :{value: ''},
      immuPerformer :{value: ''},
      immuSite :{value: ''},
    //  medicationStatement :{value: ''},
     // msPName:{value: ''},
    //  msQuantity:{value: ''},
     // msMedicationName:{value: ''},
     // msInstructions:{value: ''},
    };
  }
  
  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#patientAdd').html(p.patientAdd);
        $('#maritalStatus').html(p.maritalStatus); 
    $('#encounterReason').html(p.encounterReasons);
     $('#efname').html(p.fname);
     $('#elname').html(p.lname);
      $('#encounterLocation').html(p.encounterLocation);
    $('#iDate').html(p.immuDate);
    $('#iQuantity').html(p.immuDosage);
    $('#iLocation').html(p.immuLocation);
    $('#iManufacturer').html(p.immuManufacturer);
    $('#iPerformer').html(p.immuPerformer);
    $('#iSite').html(p.immuSite);
    //  $('#medicationStatement').html(p.medicationStatement);
    
   // $('#msPName').html(p.lname+','+p.fname);
   // $('#msQuantity').html(p.msQuantity);
   // $('#msMedicationName').html(p.msMedicationName);
  };

})(window);

