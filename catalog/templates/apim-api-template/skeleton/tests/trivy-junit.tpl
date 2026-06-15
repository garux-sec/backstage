{{- /*
  This template is a minimal JUnit XML generator for Trivy output.
  It converts Trivy JSON results into JUnit test cases.
*/ -}}
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Trivy Scan">
  <testsuite name="Trivy Security" tests="{{ len . }}">
    {{- range . }}
    <testcase name="{{ .Target | html }}" classname="Trivy">
      {{- if .Vulnerabilities }}
      <failure message="{{ len .Vulnerabilities }} vulnerabilities found">
        {{- range .Vulnerabilities }}
        [{{ .Severity }}] {{ .VulnerabilityID }}: {{ .Title }} ({{ .PkgName }})
        {{- end }}
      </failure>
      {{- end }}
      {{- if .Misconfigurations }}
      <failure message="{{ len .Misconfigurations }} misconfigurations found">
        {{- range .Misconfigurations }}
        [{{ .Severity }}] {{ .ID }}: {{ .Title }}
        {{ .Message }}
        {{- end }}
      </failure>
      {{- end }}
      {{- if .Secrets }}
      <failure message="{{ len .Secrets }} secrets found">
        {{- range .Secrets }}
        [{{ .Severity }}] {{ .Title }}: {{ .Match }}
        {{- end }}
      </failure>
      {{- end }}
    </testcase>
    {{- end }}
  </testsuite>
</testsuites>
