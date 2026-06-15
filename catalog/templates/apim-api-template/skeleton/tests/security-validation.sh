#!/usr/bin/env bash
# =============================================================================
# Security Validation Test Script — Mockup API Demo
# =============================================================================
# Validates APIM policy enforcement for the ${{ values.apiName }} endpoint.
# Covers: JWT auth, rate limiting, CORS, correlation-id, ADR-015 error schema.
#
# Usage:  chmod +x tests/security-validation.sh && ./tests/security-validation.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# ENVIRONMENT VARIABLES (Templated by Backstage Scaffolder)
# ---------------------------------------------------------------------------
APIM_BASE_URL="https://${{ values.apimServiceName }}.azure-api.net"
API_PATH="${{ values.apiPath }}"
APIM_URL="${APIM_BASE_URL}${API_PATH}"

# ---------------------------------------------------------------------------
# TODO: Replace these placeholders with your actual testing values
# ---------------------------------------------------------------------------
VALID_JWT="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."  # TODO: Replace with a valid Entra ID JWT token
INVALID_JWT="eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJmYWtlIn0."  # Deliberately malformed JWT
SUBSCRIPTION_KEY=""  # TODO: Replace with your APIM subscription key (leave empty if not required)

DISALLOWED_ORIGIN="https://evil-site.example.com"  # Origin not in the CORS allow-list
RATE_LIMIT_REQUESTS=10  # TODO: Adjust to exceed your rate-limit threshold (default tests hit it at 5)

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
TOTAL=0
PASSED=0
FAILED=0

JUNIT_FILE="test-results.xml"
mkdir -p docs

echo "Creating test results at: $(pwd)/$JUNIT_FILE"
echo '<?xml version="1.0" encoding="UTF-8"?>' > "$JUNIT_FILE"
echo '<testsuites name="API Security Validation">' >> "$JUNIT_FILE"
echo '  <testsuite name="SecurityTests" tests="7">' >> "$JUNIT_FILE"



# ---------------------------------------------------------------------------
# Helper: Escape XML special characters
# ---------------------------------------------------------------------------
xml_escape() {
  local s="$1"
  # Use sed to replace the 5 core XML entities
  echo "$s" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'"'"'/\&apos;/g'
}

# ---------------------------------------------------------------------------
# Helper: run a single test and record result
# ---------------------------------------------------------------------------
run_test() {
  local test_number="$1"
  local test_name="$2"
  local expected="$3"
  local actual="$4"
  local command_desc="$5"

  TOTAL=$((TOTAL + 1))

  echo ""
  echo -e "${CYAN}${BOLD}── Test ${test_number}: ${test_name} ──${RESET}"
  echo -e "  Command : ${command_desc}"
  echo -e "  Expected: ${expected}"
  echo -e "  Actual  : ${actual}"

  if [[ "${actual}" == "${expected}" ]]; then
    echo -e "  Result  : ${GREEN}PASS${RESET}"
    PASSED=$((PASSED + 1))
    echo "    <testcase name=\"$(xml_escape "${test_name}")\" classname=\"SecurityValidation\" />" >> "$JUNIT_FILE"
  else
    echo -e "  Result  : ${RED}FAIL${RESET}"
    FAILED=$((FAILED + 1))
    local safe_name; safe_name=$(xml_escape "${test_name}")
    local safe_expected; safe_expected=$(xml_escape "${expected}")
    local safe_actual; safe_actual=$(xml_escape "${actual}")
    local safe_cmd; safe_cmd=$(xml_escape "${command_desc}")
    echo "    <testcase name=\"${safe_name}\" classname=\"SecurityValidation\">" >> "$JUNIT_FILE"
    echo "      <failure message=\"Expected ${safe_expected} but got ${safe_actual}\">" >> "$JUNIT_FILE"
    echo "        Command: ${safe_cmd}" >> "$JUNIT_FILE"
    echo "      </failure>" >> "$JUNIT_FILE"
    echo "    </testcase>" >> "$JUNIT_FILE"
  fi
}

# =============================================================================
echo -e "${BOLD}=============================================${RESET}"
echo -e "${BOLD} Security Validation Tests — ${{ values.apiName }}${RESET}"
echo -e "${BOLD}=============================================${RESET}"
echo -e "Target: ${APIM_URL}"
echo ""

SUB_KEY_HEADER=""
[[ -n "${SUBSCRIPTION_KEY}" ]] && SUB_KEY_HEADER="-H \"Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}\""

# ---------------------------------------------------------------------------
# Test 1: Valid JWT -> expect HTTP 200
# ---------------------------------------------------------------------------
CMD_DESC="curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer <VALID_JWT>' ${SUB_KEY_HEADER} ${APIM_URL}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${VALID_JWT}" \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "000")

run_test 1 "Valid JWT - HTTP 200" "200" "${HTTP_CODE}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 2: No JWT -> expect HTTP 401
# ---------------------------------------------------------------------------
CMD_DESC="curl -s -o /dev/null -w '%{http_code}' ${SUB_KEY_HEADER} ${APIM_URL}  (no Authorization header)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "000")

run_test 2 "No JWT - HTTP 401" "401" "${HTTP_CODE}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 3: Invalid JWT -> expect HTTP 401
# ---------------------------------------------------------------------------
CMD_DESC="curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer <INVALID_JWT>' ${SUB_KEY_HEADER} ${APIM_URL}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${INVALID_JWT}" \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "000")

run_test 3 "Invalid JWT - HTTP 401" "401" "${HTTP_CODE}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 4: Rate limit exceeded -> expect HTTP 429
# ---------------------------------------------------------------------------
CMD_DESC="Send ${RATE_LIMIT_REQUESTS} rapid requests to ${APIM_URL} - expect at least one HTTP 429"
GOT_429="no"
for i in $(seq 1 "${RATE_LIMIT_REQUESTS}"); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${VALID_JWT}" \
    ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
    "${APIM_URL}" 2>/dev/null || echo "000")
  if [[ "${CODE}" == "429" ]]; then
    GOT_429="yes"
    break
  fi
done

run_test 4 "Rate limit exceeded - HTTP 429" "yes" "${GOT_429}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 5: Disallowed CORS origin -> request blocked
# ---------------------------------------------------------------------------
CMD_DESC="curl -s -D- -H 'Origin: ${DISALLOWED_ORIGIN}' -X OPTIONS ${APIM_URL} - expect no Access-Control-Allow-Origin for disallowed origin"
CORS_RESPONSE=$(curl -s -D- -o /dev/null \
  -H "Origin: ${DISALLOWED_ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "")

if echo "${CORS_RESPONSE}" | grep -qi "access-control-allow-origin.*${DISALLOWED_ORIGIN}"; then
  CORS_BLOCKED="no"
else
  CORS_BLOCKED="yes"
fi

run_test 5 "Disallowed CORS origin - blocked" "yes" "${CORS_BLOCKED}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 6: X-Correlation-ID header present
# ---------------------------------------------------------------------------
CMD_DESC="curl -s -D- -H 'Authorization: Bearer VALID_JWT' ${APIM_URL} - response contains X-Correlation-ID header"
HEADERS=$(curl -s -D- -o /dev/null \
  -H "Authorization: Bearer ${VALID_JWT}" \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "")

if echo "${HEADERS}" | grep -qi "x-correlation-id"; then
  HAS_CORR_ID="yes"
else
  HAS_CORR_ID="no"
fi

run_test 6 "X-Correlation-ID header present" "yes" "${HAS_CORR_ID}" "${CMD_DESC}"

# ---------------------------------------------------------------------------
# Test 7: Error response matches ADR-015 schema (error.code, error.message)
# ---------------------------------------------------------------------------
CMD_DESC="curl -s ${APIM_URL} (no JWT) - response body must have error.code and error.message"
ERROR_BODY=$(curl -s \
  ${SUBSCRIPTION_KEY:+-H "Ocp-Apim-Subscription-Key: ${SUBSCRIPTION_KEY}"} \
  "${APIM_URL}" 2>/dev/null || echo "{}")

HAS_CODE=$(echo "${ERROR_BODY}" | grep -o '"code"' | head -1 || echo "")
HAS_MESSAGE=$(echo "${ERROR_BODY}" | grep -o '"message"' | head -1 || echo "")

if [[ -n "${HAS_CODE}" && -n "${HAS_MESSAGE}" ]]; then
  SCHEMA_MATCH="yes"
else
  SCHEMA_MATCH="no"
fi

run_test 7 "Error response matches ADR-015 schema" "yes" "${SCHEMA_MATCH}" "${CMD_DESC}"

# =============================================================================
# Summary Report
# =============================================================================
echo ""
echo -e "${BOLD}=============================================${RESET}"
echo -e "${BOLD}           SUMMARY REPORT${RESET}"
echo -e "${BOLD}=============================================${RESET}"
echo -e "  Total tests : ${TOTAL}"
echo -e "  Passed      : ${GREEN}${PASSED}${RESET}"
echo -e "  Failed      : ${RED}${FAILED}${RESET}"
echo -e "${BOLD}=============================================${RESET}"

echo '  </testsuite>' >> "$JUNIT_FILE"
echo '</testsuites>' >> "$JUNIT_FILE"



if [[ "${FAILED}" -gt 0 ]]; then
  echo -e "${RED}${BOLD}Some tests failed. Review the output above for details.${RESET}"
  exit 1
else
  echo -e "${GREEN}${BOLD}All tests passed!${RESET}"
  exit 0
fi
