
    $(document).ready(function(){
      var uploadUrl;
      setInterval(function(){ 
        if(!uploadUrl) {
          console.log('Nema url');
        } else {
            var url = uploadUrl;
            uploadUrl = null;
            var theFormFile = $('#file_photo').get()[0].files[0];

            $.ajax({
            url: url,
            type: "PUT",
            data: theFormFile,
            contentType: 'binary/octet-stream',
            headers: {
            "accept": "application/json",
            "Access-Control-Allow-Origin":"*",
            },
            processData: false,
            success: function (response) {
              alert('Product is added.');
          
            console.log(response);
          } ,
          error: function (xhr, status) {
          alert("error");
          }
          })                        
      }
      }, 3000);

      $("#submitId").click(function(){
        if (!$("#formId").valid()) {
          return;
        }
        $.ajax({
          url: "https://gd40kn044b.execute-api.us-east-2.amazonaws.com/testing/product/new-product",
          type: "POST",
          crossDomain: true,
          data: JSON.stringify({
                                  product_name: $("#productNameId").val(),
                                  price: $("#priceId").val(),
                                  category : $("#categoryId").val(),
                                  description : $("#descriptionId").val()
                              }),
          headers: {
            "accept": "application/json",
            "Access-Control-Allow-Origin":"*",
            "Content-Type": "application/json",
            "authorizationToken": "dW5kZWZpbmVkfHlveDFCV2E0VnF8MTUzNjA3MzI3MTM4NHxKQXJOdC9aaVpoZlRWcFB4U29PVStUbHJUM2FGWXlaRUR2cWV5WUF5aHVZPQ=="
        },

          success: function (response) {
              uploadUrl = response.url;
              console.log(uploadUrl);

           },

          error: function (xhr, status) {
              alert("error");
          }
      })
    })

    $("#formId").validate({ 
      errorClass: 'errors',
      rules: {
       category: "required",
       productName: "required",
       price:  "required",
       uploadImg: "required"
      },

      messages: {
       category: "Please enter a category.",
       productName: "Please enter product name.", 
       price:  "Please enter price.",
       uploadImg: "Please insert an image."
        }
    })
      

    
  })
  