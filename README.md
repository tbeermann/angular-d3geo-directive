# angular-d3geo-directives

An Angular directive for reusable web maps using D3 and GeoJSON

## Requirements
- Angular
- D3

## Example

### Directive Example

```
<div ng-controller='MainCtrl'>
    <d3map
        geojson="data"
        symbols=""
        hoversymbols=""
        projection=mercator
        height=600
        width=1000
        zoomto=false
        pan=true
        >
    </d3map>
</div>
```

### Control Example

```
var mapApp = angular.module('d3GeoDirectives', ['d3MapModule']);

mapApp.service('dataService', function( $http, $q ){
    function getData() {
        var request = $http({
            method: "get",
            url: "data/world.geojson",
            params: {
                action: "get"
            }
        });
        return( request.then( handleSuccess, handleError ) );
    }

    function handleError(response) {
        if (! angular.isObject( response.data ) || ! response.data.message) {
            return( $q.reject( "No data for you!" ));
        }
        return($q.reject(response.data.message));
    }

    function handleSuccess( response ) {
        return( response.data );
    }

    return {get:getData} ;
});

mapApp.controller('MainCtrl', function($scope, dataService) {
    $scope.data;
    $scope.style = {color:'purple', opacity:.9, stroke:'#67C8FF', strokeWidth:.4};

    loadRemoteData();

    function loadRemoteData() {
        dataService.get().then(
            function( data ) {
                applyRemoteData( data );
            });
    }

    function applyRemoteData(data){
        $scope.data = data;
    }
});
```



