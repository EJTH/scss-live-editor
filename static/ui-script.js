$(function(){
  $(document).on('click', '.collapsable .activator', function(e){
    $(this).parent().toggleClass('collapsed');
  });
  $('.fuse').each(function(a,b){
    $(b).contents().each(function() {
        if(this.nodeType == 3) $(this).remove();
    });
  });
});
