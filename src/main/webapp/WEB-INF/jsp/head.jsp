<%@page import="java.io.File"%>
<%@page import="java.net.URL"%>
<%@page import="gov.usgs.cida.config.DynamicReadOnlyProperties"%>
<%@page import="org.apache.commons.lang.StringUtils"%>
<%@page import="java.util.Enumeration"%>
<%!
	protected DynamicReadOnlyProperties props = null;
	{
		try {
			URL applicationProperties = getClass().getClassLoader().getResource("application.properties");
			File propsFile = new File(applicationProperties.toURI());
			props = new DynamicReadOnlyProperties(propsFile);
			props = props.addJNDIContexts(new String[0]);
		} catch (Exception e) {
		}
	}
%>
<%
Boolean development = Boolean.parseBoolean(props.getProperty("gdp.development"));	
String versionProject = props.get("version");
String versionJquery = props.get("version.jquery");
String versionBootstrap = props.get("version.bootstrap");
String versionFontAwesome = props.get("version.fontawesome");
String versionOpenLayers = props.get("version.openlayers");
String versionHandlebars = props.get("version.handlebars");
String versionBackbone = props.get("version.backbone");
String versionUnderscore = props.get("version.underscore");
String versionBsDatePicker= props.get("version.bsDatePicker");
String versionJqueryFileUpload = props.get("version.jqueryFileUpload");
String versionJqueryUI = props.get("version.jqueryUI");
String resourceSuffix = development ? "" : "-" + versionProject + "-min";
String baseUrl = props.getProperty("gdp.base.url");
	if (!baseUrl.endsWith("/")) { baseUrl += "/"; }
String gaCode = development ? "" : "UA-34380265-1";
%>

<jsp:include page="template/USGSHead.jsp">
			<jsp:param name="relPath" value="<%= baseUrl %>" />
			<jsp:param name="shortName" value="USGS Geo Data Portal" />
			<jsp:param name="title" value="USGS Geo Data Portal" />
			<jsp:param name="description" value="" />
			<jsp:param name="author" value="" />
			<jsp:param name="keywords" value="" />
			<jsp:param name="publisher" value="" />
			<jsp:param name="revisedDate" value="" />
			<jsp:param name="nextReview" value="" />
			<jsp:param name="expires" value="never" />
			<jsp:param name="google-analytics-account-code" value="<%= gaCode %>" />
			<jsp:param name="development" value="<%=development%>" />
</jsp:include>

<link type="text/css" rel="stylesheet" href="<%= baseUrl %>webjars/font-awesome/<%= versionFontAwesome%>/css/font-awesome<%= development ? "" : ".min"%>.css" />

<script type="text/javascript">
	var GDP = GDP || {};
	GDP.BASE_URL = "<%= baseUrl%>";
	GDP.DEVELOPMENT = "<%= development%>";
	GDP.incomingMethod = "<%= request.getMethod() %>";
	GDP.incomingParams = {
		<% 
			Enumeration<String> paramNames = request.getParameterNames();
			while (paramNames.hasMoreElements()) {
				String key = paramNames.nextElement();
				String value = request.getParameter(key);
				if (StringUtils.isNotBlank(key)) {
					if (paramNames.hasMoreElements()){
		%>
						"<%=key%>" : "<%=value%>",
		<%
					}
					else {
		%>
						"<%=key%>" : "<%=value%>"
		<%						
					}
				}
			}
		%>
	};
</script>
