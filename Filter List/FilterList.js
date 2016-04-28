function initializeListWithFilters(){
	var koModel = this;
	
	koModel.ListName = "LDFP Experts English";
	koModel.FieldType = "MultiChoice";
	koModel.ResultFields = [
        {
            "ColumnTitle":"Title",
            "FieldName":"Title",
            "FieldType":"Text"
        },
        {
            "ColumnTitle":"General Comments",
            "FieldName":"General_x0020_comments",
            "FieldType":"Text"
        },
        {
            "ColumnTitle":"Email",
            "FieldName":"Email_x003a_",
            "FieldType":"Text"
        },
        {
            "ColumnTitle":"Consultant CV",
            "FieldName":"Consultant_x0020_CV",
            "FieldType":"Link"
        }
    ];
	
	koModel.Items = ko.observableArray();
	koModel.Fields = ko.observableArray();
	function getListFields(){
		var xmlhttp = new XMLHttpRequest();
		var url = window._spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/GetByTitle('"+koModel.ListName+"')/fields?$filter=(TypeAsString eq '"+koModel.FieldType+"')";

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var response = jQuery.parseXML(xmlhttp.responseText);
				var fields = $(response).find('feed entry content');
				var ViewModel = addFields(fields);
				ko.applyBindings(ViewModel);
			}
		};
		xmlhttp.open("GET", url, true);
		xmlhttp.setRequestHeader('accept','application/xml');
		xmlhttp.send();
	};
	function addFields(fields){
		for(var x=0; x < fields.length; x++){
			var field = {
				'Choices':ko.observableArray(),
				'Title':"",
				'StaticName':"",
			};
			var choice = {
				name:"",
				selected:false
			}
			var properties = fields[x].childNodes[0].childNodes;
			for(var i=0; i< properties.length; i++){
				if(properties[i].localName == 'Title'){
					field.Title = properties[i].textContent;
				}
				
				if(properties[i].localName == 'StaticName'){
					field.StaticName = properties[i].textContent;
				}
				
				if(properties[i].localName == "Choices"){
					for(var z = 0; z<properties[i].childNodes.length; z++){
						var choice = {
							'Name':properties[i].childNodes[z].textContent,
							'Selected':ko.observable(false)
						}
						choice.Selected.subscribe(queryForItems);
						field.Choices.push(choice);
					}
				}
			}

			koModel.Fields.push(field);
		}
	};
    function buildCamlQuery(){
		var fullQuery = "";
		var singleFieldQueries = [];
		for(x =0;x < koModel.Fields().length;x++){
			var field = koModel.Fields()[x];
			var singleValueQueries = []
			var fieldQuery = "";
			for(var z = 0; z < field.Choices().length;  z++){
				var choice = field.Choices()[z];
				if(choice.Selected() == true){
					var singleChoiceQuery = "<Eq><FieldRef Name='"+field.StaticName+"'/><Value Type='Text'>"+choice.Name+"</Value></Eq>";
					singleValueQueries.push(singleChoiceQuery);
				}
			};
			
			if(singleValueQueries.length > 1){
				fieldQuery = "";
				if(singleValueQueries.length == 2){
					fieldQuery = "<Or>" + singleValueQueries[0] + singleValueQueries[1] + "</Or>";
				}else{
					//there is more than 2 or values
					var numberOfQueries = 0;
					while(singleValueQueries.length > 0){
	
						if(singleValueQueries.length < 2){
							fieldQuery += singleValueQueries.pop();
						}else{
							fieldQuery += "<Or>" + singleValueQueries.pop();
						}
						numberOfQueries++;
					}
					
					for(var t = 1; t < numberOfQueries; t++){
						fieldQuery += "</Or>";
					}
				}
				singleFieldQueries.push(fieldQuery);
			}else if(singleValueQueries.length == 1){
				singleFieldQueries.push(singleValueQueries[0]);
			}

		}
		
		if(singleFieldQueries.length > 1){
			fullQuery = "";
			if(singleFieldQueries.length == 2){
				fullQuery = "<And>" + singleFieldQueries[0] + singleFieldQueries[1] + "</And>";
			}else{
				var numberOfQueries = 0;
				while(singleFieldQueries.length > 0){
					if(singleFieldQueries.length < 2){
						fullQuery += singleFieldQueries.pop();
					}else{
						fullQuery += "<And>" + singleFieldQueries.pop();
					}
					numberOfQueries++
				}
				
				for(var x = 1; x < numberOfQueries; x++){
					fullQuery += "</And>";
				}
			}
		}else if(singleFieldQueries.length == 1){
			fullQuery = singleFieldQueries[0];	
		}
		
		
		
		var camlQuery = new SP.CamlQuery();
		camlQuery.set_viewXml("<View><Query><Where>"+fullQuery+"</Where></Query></View>");
		console.log("<View><Query><Where>"+fullQuery+"</Where></Query></View>");
		return camlQuery;
	};
    	
	function queryForItems(){
		var camlQuery = buildCamlQuery();
		var clientContext = new SP.ClientContext.get_current();
		var oList = clientContext.get_web().get_lists().getByTitle(koModel.ListName);
		
		var collListItem = oList.getItems(camlQuery);

		clientContext.load(collListItem);
		clientContext.executeQueryAsync(
		function(sender,args){
			koModel.Items.removeAll();
			var listItemInfo = '';
			var listItemEnumerator = collListItem.getEnumerator();
			while (listItemEnumerator.moveNext()) {
				var oListItem = listItemEnumerator.get_current();
				var item = {};
                for(var resultField in koModel.ResultFields){
                    try{
                        item[resultField.FieldName] = oListItem.get_item(resultField.FieldName);
                    }catch(err){
                        console.log("The field name " + resultField.FieldName + " is not correct");
                        item[resultField.FieldName] = "";
                    } 
                }
				koModel.Items.push(item);
			}
		},
		function (sender, args) {
			alert('Request failed. ' + args.get_message() + '\n' + args.get_stackTrace());
		});
	};


	getListFields();
}

$(document).ready(function(){initializeListWithFilters()});