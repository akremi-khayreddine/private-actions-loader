
const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const { parse } = require("yaml");
const { readFileSync } = require("fs");
const { join } = require("path");
const { sync } = require("rimraf");


const token = core.getInput('TOKEN', { required: true });
const repoName = core.getInput('REPO', { required: true });
const actionDirectory = core.getInput('ACTION-DIRECTORY', { required: false });
const workDirectory = './.private-action';

runAction(
    token,
    repoName,
    workDirectory,
    actionDirectory
).then(() => {
    core.info('Action completed successfully');
}).catch(e => {
    core.setFailed(e.toString());
});

setInputs = (action) => {
    if (!action.inputs) {
        core.info('No inputs defined in action.');
        return;
    }

    core.info(`The configured inputs are ${Object.keys(action.inputs)}`);

    for (const i of Object.keys(action.inputs)) {
        const formattedInputName = `INPUT_${i.toUpperCase()}`;

        if (process.env[formattedInputName]) {
            core.info(`Input ${i} already set`);
            continue;
        } else if (!action.inputs[i].required && !action.inputs[i].default) {
            core.info(`Input ${i} not required and has no default`);
            continue;
        } else if (action.inputs[i].required && !action.inputs[i].default) {
            core.error(`Input ${i} required but not provided and no default is set`);
        }

        core.info(`Input ${i} not set.  Using default '${action.inputs[i].default}'`);
        process.env[formattedInputName] = action.inputs[i].default;
    }
}

async function runAction(
    token,
    repoName,
    workDirectory,
    actionDirectory
) {
    const [repo, sha] = repoName.split('@');

    core.info('Masking token just in case');
    core.setSecret(token);

    core.startGroup('Cloning private action');
    const repoUrl = `https://${token}@github.com/${repo}.git`;
    const cmd = ['git clone', repoUrl, workDirectory].join(' ');

    core.info(
        `Cloning action from https://***TOKEN***@github.com/${repo}.git${sha ? ` (SHA: ${sha})` : ''}`
    );
    await exec.exec(cmd);

    core.info('Remove github token from config');
    await exec.exec(`git remote set-url origin https://github.com/${repo}.git`, undefined, {
        cwd: workDirectory,
    });

    if (sha) {
        core.info(`Checking out ${sha}`);
        await exec.exec(`git checkout ${sha}`, undefined, { cwd: workDirectory });
    }

    // if actionDirectory specified, join with workDirectory (for use when multiple actions exist in same repo)
    // if actionDirectory not specified, use workDirectory (for repo with a single action at root)
    const actionPath = actionDirectory
        ? join(workDirectory, actionDirectory)
        : workDirectory;

    core.info(`Reading ${actionPath}`);
    const actionFile = readFileSync(`${actionPath}/action.yml`, 'utf8');
    const action = parse(actionFile);

    if (!(action && action.name && action.runs && action.runs.main)) {
        throw new Error('Malformed action.yml found');
    }

    core.endGroup();

    core.startGroup('Input Validation');
    setInputs(action);
    core.endGroup();

    core.info(`Starting private action ${action.name}`);
    core.startGroup(`${action.name}`);
    await exec.exec(`node ${join(actionPath, action.runs.main)}`);
    core.endGroup();

    core.info(`Cleaning up action`);
    sync(workDirectory);
}