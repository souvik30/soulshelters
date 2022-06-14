$(document).ready(function () {
    var searchData = {};
    $("#searchButton").click(function () {
        searchData = {
            state: $("#state").val().trim(),
            city: $("#city").val().trim(),
            laundry: $("#laundry").val().trim(),
            wifi: $("#wifi").val().trim(),
            food: $("#food").val().trim(),
            cleaners: $("#cleaners").val().trim(),
            security: $("#security").val().trim(),
            gender: $("input[name='gender']:checked").val()

        }
        $("#errorCity").html("");
        $("#errorGender").html("");

        if (searchData.city == "") {
            $("#errorCity").html("Please Enter City Name");
            return false;
        }
        else if (searchData.gender == undefined) {
            $("#errorGender").html("Please choose a gender");
            return false;
        }

    })

})