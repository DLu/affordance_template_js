/**
 * @author David V. Lu!! - davidvlu@gmail.com
 */

var buttons = {"start":"GO_TO_START",  "rwnd":"STEP_BACKWARD", "sync":"SYNC", "ffwd":"STEP_FORWARD", "end": "GO_TO_END"};

/** 
 * @constructor
 */
function AffordanceTemplateInterface(options) {
    options = options || {};
    var ros = options.ros;
    var robot = options.robot || 'r2'
    var that = this;
    
    this.make_buttons();
    
    this.add_template_client = new ROSLIB.Service({
      ros : ros,
      name : '/affordance_template_server/add_template',
      serviceType : 'affordance_template_msgs/AddAffordanceTemplate'
    });
    
    this.delete_template_client = new ROSLIB.Service({
      ros : ros,
      name : '/affordance_template_server/delete_template',
      serviceType : 'affordance_template_msgs/DeleteAffordanceTemplate'
    });
    
    this.get_running_client = new ROSLIB.Service({
      ros : ros,
      name : '/affordance_template_server/get_running',
      serviceType : 'affordance_template_msgs/GetRunningAffordanceTemplates'
    });
    
    this.get_templates_client = new ROSLIB.Service({
       ros : ros,
       name : '/affordance_template_server/get_templates',
       serviceType : 'affordance_template_msgs/GetAffordanceTemplateConfigInfo'
     });    
     
    this.get_robots_client = new ROSLIB.Service({
      ros : ros, 
      name : '/affordance_template_server/get_robots',
      serviceType : 'affordance_template_msgs/GetRobotConfigInfo'
    });
    
    this.set_template_trajectory_client = new ROSLIB.Service({
      ros : ros, 
      name : '/affordance_template_server/set_template_trajectory',
      serviceType : 'affordance_template_msgs/SetAffordanceTemplateTrajectory'
    });
    
    this.get_template_status_client = new ROSLIB.Service({
      ros : ros, 
      name : '/affordance_template_server/get_template_status',
      serviceType : 'affordance_template_msgs/GetAffordanceTemplateStatus'
    });    
    
    this.plan_command_client = new ROSLIB.Service({
      ros : ros, 
      name : '/affordance_template_server/plan_command',
      serviceType : 'affordance_template_msgs/AffordanceTemplatePlanCommand'
    });    
    
    this.execute_command_client = new ROSLIB.Service({
      ros : ros, 
      name : '/affordance_template_server/execute_command',
      serviceType : 'affordance_template_msgs/AffordanceTemplateExecuteCommand'
    });    
    
    var request = new ROSLIB.ServiceRequest({name : robot});
    
    this.get_robots_client.callService(request, function(result) {
      that.robot_info = result.robots[0];
      that.setup_ee_box();
    });
       
    this.get_templates_client.callService(request, function(result) {
      that.templates = result.templates;
      that.populate_affordances('affordance_list');
    });
};

function make_box(id, label, root)
{
    root.appendChild( document.createElement('br') );
    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.text = label;
    root.appendChild( label );
    
    var select = document.createElement('select');
    select.setAttribute('style', 'min-width: 150px')
    select.setAttribute('id', id);
    
    root.appendChild( select );
}
AffordanceTemplateInterface.prototype.make_buttons = function() 
{
    var that = this;
    var path = "affordance_template_js/images/"
    var controls = document.getElementById("controls");
    controls.innerHTML = '';
        
    for(b in buttons){
        var btn = document.createElement("img");
        btn.setAttribute('name', buttons[b]);
        btn.setAttribute('src', path +b + '.png');
        btn.setAttribute('width', '50px');
        btn.onclick = function() { that.button(this.name) };
        controls.appendChild(btn);
    }
    make_box('template_box', 'Template: ', controls);
    make_box('trajectory_box', 'Trajectory: ', controls);
}

AffordanceTemplateInterface.prototype.on_check = function(name, value)
{
  var that = this;
  if(value){
    var request = new ROSLIB.ServiceRequest({class_type: name});
    this.add_template_client.callService(request, function(result) {
        that.update_all();
    });
  }else{
    var template = this.get_template();
    var keys = template.split(':');
    var tname = keys[0], num=parseInt(keys[1]);
    if(name!=tname)
        return;
    
    var request = new ROSLIB.ServiceRequest({class_type: name, id: num});
    this.delete_template_client.callService(request, function(result) {
        that.update_all();
    });      
  }
}

AffordanceTemplateInterface.prototype.setup_ee_box = function(ids, end_effectors, num_points)
{
    s = "<table><tr><th><th>name<th>cmd<th>@wp<th>#wps<th>Status";
    for(var i in this.robot_info.end_effectors)
    {
        var ee = this.robot_info.end_effectors[i];
        var n = parseInt(i) + 1;
        s += "<tr><td>" + n;
        s += "<td>" + ee.name;
        s += "<td><input name=\"ee_opt_" + ee.name + "\" id=\"ee_opt_" + ee.name + "\" type=\"checkbox\" checked=\"checked\" />";
        s += "<td id=\"ee_a_" + ee.name + "\">X</td>";
        s += "<td id=\"ee_n_" + ee.name + "\">X</td>";
        s += "<td id=\"ee_s_" + ee.name + "\">X</td>";
    }
    s += "</table>";
    document.getElementById("ee_box").innerHTML = s;
}

AffordanceTemplateInterface.prototype.update_select_box = function(id, options, change_callback)
{
    var tbox = document.getElementById(id);    
    var prev = tbox.options[tbox.selectedIndex];        
    tbox.innerHTML = '';
    tbox.onchange=function() { change_callback.call(this) };
    
    for(var i in options){
        var option = document.createElement("option");
        option.text = options[i];
        tbox.add(option);
    }
    
    if(prev != tbox.options[tbox.selectedIndex]){
        change_callback.call(this);
    }
}

AffordanceTemplateInterface.prototype.update_all = function()
{
    var request = new ROSLIB.ServiceRequest({});

    var that = this;
    this.get_running_client.callService(request, function(result) {
        that.update_select_box('template_box', result.templates, that.update_template);
    });
}

AffordanceTemplateInterface.prototype.get_select_value = function(id)
{
    var tbox = document.getElementById(id);
    var opt = tbox.options[tbox.selectedIndex];
    if(!opt){
        return;
    }
    return opt.value;
}

AffordanceTemplateInterface.prototype.get_template = function()
{
    return this.get_select_value('template_box');
}

AffordanceTemplateInterface.prototype.get_trajectory = function()
{
    return this.get_select_value('trajectory_box');
}

AffordanceTemplateInterface.prototype.search_by_key = function(list, name, field)
{
    for(var i in list)
    {
        if(list[i][field] == name )
            return list[i];
    }
}

AffordanceTemplateInterface.prototype.get_template_object = function(name)
{
    return this.search_by_key(this.templates, name, 'type');
}

AffordanceTemplateInterface.prototype.get_trajectory_object = function(template, traj)
{
    var template = this.get_template_object(template);
    if(template)
        return this.search_by_key(template.trajectory_info, traj, 'name');
    else
        return;    
}

AffordanceTemplateInterface.prototype.update_template = function()
{
    var template = this.get_template();
    if(template == undefined){
        return;
    }
    var keys = template.split(':');
    var name = keys[0], num=keys[1];
    
    var to = this.get_template_object(name);
    if(to){
        var trajs = to.trajectory_info;
        var names = [];
        for(var j in trajs){
            names.push(trajs[j].name);
        }
        this.update_select_box('trajectory_box', names, this.update_trajectory);
    }
}

AffordanceTemplateInterface.prototype.update_trajectory = function()
{
    var template = this.get_template();
    var traj = this.get_trajectory();
    var request = new ROSLIB.ServiceRequest({name: template, trajectory: traj});
    this.set_template_trajectory_client.callService(request, function(result) {
    });
    var keys = template.split(':');
    var name = keys[0], num=keys[1];
    var tinfo = this.get_trajectory_object(name, traj) ;
    var mmap = [];
    for( var i in tinfo.waypoint_info )
    {
        mmap[ tinfo.waypoint_info[i].id ] = tinfo.waypoint_info[i];
    }
    
    for(var i in this.robot_info.end_effectors)
    {
        var ee = this.robot_info.end_effectors[i];
        var j = mmap[ ee.id ];
        if(j == undefined){
            document.getElementById('ee_opt_' + ee.name).disabled = true;
            document.getElementById('ee_n_' + ee.name).innerHTML = '0';
            document.getElementById('ee_s_' + ee.name).innerHTML = 'N/A';
        }else{
            document.getElementById('ee_opt_' + ee.name).disabled = false;
            document.getElementById('ee_n_' + ee.name).innerHTML = j.num_waypoints;
            document.getElementById('ee_s_' + ee.name).innerHTML = '';
            
        }
    }
    this.control_status_update();
    
    
}

AffordanceTemplateInterface.prototype.populate_affordances = function(id)
{
    document.getElementById(id).innerHTML = '';
    var that = this;
    for(i in this.templates){
        var element = this.templates[i];
        var name = element.type;
        // create the necessary elements
        var label= document.createElement("label");
        var description = document.createTextNode(name);
        var checkbox = document.createElement("input");

        checkbox.type = "checkbox";    // make the element a checkbox
        checkbox.name = name;          // give it a name we can check on the server side
        checkbox.value = name;         // make its value element
        checkbox.onclick=function() { that.on_check(this.name, this.checked); };

        label.appendChild(checkbox);   // add the box to the element
        label.appendChild(description);// add the description to the element

        // add the label element to your div
        document.getElementById(id).appendChild(label);
    }
    
    this.update_all();
}

AffordanceTemplateInterface.prototype.control_status_update = function()
{
    var that = this;
    var template = this.get_template();
    var traj = this.get_trajectory();
    var request = new ROSLIB.ServiceRequest({name: template, trajectory_name: traj});
    this.get_template_status_client.callService(request, function(result) {
        var info = result.affordance_template_status[0].waypoint_info;
        for(var i in info)
        {
            var name = info[i].end_effector_name;
            var index = info[i].waypoint_index;
            document.getElementById('ee_a_' + name).innerHTML = index;
            
            var status = document.getElementById('ee_s_' + name);
            
            if (info[i].execution_valid) {
                status.style.color = '0x0000ff';
                status.innerHTML = 'SUCCESS';
            } else {
                if (info[i].plan_valid) {
                    status.style.color = '0x00ff00';
                    status.innerHTML = "PLAN -> id[" + info[i].waypoint_plan_index + "]";
                } else {
                    status.style.color = '0xff0000';
                    status.innerHTML = "NO PLAN -> id[" + info[i].waypoint_plan_index + "]";
                }
            }
        }
    });
}

AffordanceTemplateInterface.prototype.button = function(id)
{
    this.control_status_update();
}
