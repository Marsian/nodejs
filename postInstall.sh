HOME=$OPENSHIFT_REPO_DIR bower install || bower install

INPUT_PATH="App/Day/Elements/elements.html"
OUTPUT_PATH="App/Day/Elements/elements.vulcanized.html"
HOME=$OPENSHIFT_REPO_DIR vulcanize --abspath ./ "$INPUT_PATH" --out-html "$OUTPUT_PATH" || vulcanize --abspath ./ "$INPUT_PATH" --out-html "$OUTPUT_PATH"
