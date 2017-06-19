#!/bin/sh

: ${SUITEC_BASE_DIR?"[ERROR] Please set env variable SUITEC_BASE_DIR to base directory of SuiteC deployment."}

[ -d "${SUITEC_BASE_DIR}" ] || { echo "[ERROR] No such directory. Value of env variable SUITEC_BASE_DIR is invalid: ${SUITEC_BASE_DIR}"; exit 1; }

exit 0
