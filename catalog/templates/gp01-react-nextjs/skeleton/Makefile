# GP#01 Infrastructure Orchestration
# Usage: make deploy ENV=dev PROJECT=my-app

ENV ?= dev
PROJECT ?= $(PROJECT_NAME)
TF_DIR = infra/terraform
ANSIBLE_DIR = infra/ansible

.PHONY: all init plan apply deploy destroy clean

all: deploy

## Terraform targets
init:
	cd $(TF_DIR) && terraform init \
		-backend-config="resource_group_name=tfstate-rg" \
		-backend-config="storage_account_name=tfstate$(PROJECT)" \
		-backend-config="container_name=tfstate" \
		-backend-config="key=$(PROJECT).$(ENV).tfstate"

plan: init
	cd $(TF_DIR) && terraform plan \
		-var-file="terraform.tfvars" \
		-var="environment=$(ENV)" \
		-var="subscription_id=$(AZURE_SUBSCRIPTION_ID)" \
		-var="db_password=$(DB_PASSWORD)" \
		-out=tfplan

apply: plan
	cd $(TF_DIR) && terraform apply -auto-approve tfplan

## Ansible targets
configure:
	cd $(ANSIBLE_DIR) && pip install -q ansible && \
	PROJECT_NAME=$(PROJECT) ENVIRONMENT=$(ENV) \
	BUILD_ARTIFACT_PATH=$(BUILD_ARTIFACT_PATH) \
	ansible-playbook deploy.yml

## Combined deploy
deploy: apply configure
	@echo "✅ Deployment complete: $(PROJECT) → $(ENV)"

## Destroy (requires confirmation)
destroy: init
	cd $(TF_DIR) && terraform destroy \
		-var-file="terraform.tfvars" \
		-var="environment=$(ENV)" \
		-var="subscription_id=$(AZURE_SUBSCRIPTION_ID)" \
		-var="db_password=$(DB_PASSWORD)"

## Utility
clean:
	rm -f $(TF_DIR)/tfplan $(TF_DIR)/.terraform.lock.hcl
	rm -rf $(TF_DIR)/.terraform

validate: init
	cd $(TF_DIR) && terraform validate
	cd $(ANSIBLE_DIR) && ansible-playbook deploy.yml --syntax-check
