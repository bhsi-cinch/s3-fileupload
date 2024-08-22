import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import {
    AppLayout,
    ContentLayout,
    SideNavigation,
    Header,
    SpaceBetween,
    Link,
    Button,
    Alert,
    ProgressBar,
    FormField,
    TokenGroup,
    Container,
    TopNavigation
} from "@cloudscape-design/components";
import { Amplify, Auth, Storage } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

import awsconfig from './aws-exports';

Amplify.configure(awsconfig);

const appLayoutLabels = {
    navigation: 'Side navigation',
    navigationToggle: 'Open side navigation',
    navigationClose: 'Close side navigation',
    notifications: 'Notifications',
    tools: 'Help panel',
    toolsToggle: 'Open help panel',
    toolsClose: 'Close help panel'
};

const ServiceNavigation = () => {
    const location = useLocation();
    let navigate = useNavigate();

    function onFollowHandler(event) {
        if (!event.detail.external) {
            event.preventDefault();
            navigate(event.detail.href);
        }
    }

    return (
        <SideNavigation
            activeHref={location.pathname}
            header={{ href: "/", text: "S3 Object Uploader" }}
            onFollow={onFollowHandler}
            items={[
                { type: "link", text: "Upload", href: "/" },
                { type: "divider" },
                {
                    type: "link",
                    text: "Go Home",
                    href: "https://www.berxi.com/",
                    external: true
                }
            ]}
        />
    );
}

function formatBytes(a, b = 2, k = 1024) {
    let d = Math.floor(Math.log(a) / Math.log(k));
    return 0 === a ? "0 Bytes" : parseFloat((a / Math.pow(k,
        d)).toFixed(Math.max(0, b))) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB",
        "EB", "ZB", "YB"][d];
}

const Content = () => {
    const hiddenFileInput = useRef(null);
    const [visibleAlert, setVisibleAlert] = useState(false);
    const [uploadList, setUploadList] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [historyList, setHistoryList] = useState([]);
    const [historyCount, setHistoryCount] = useState(0);

    const handleClick = () => {
        hiddenFileInput.current.value = "";
        hiddenFileInput.current.click();
    };

    const handleChange = e => {
        e.preventDefault();
        let i, tempUploadList = [];
        for (i = 0; i < e.target.files.length; i++) {
            tempUploadList.push({
                label: e.target.files[i].name,
                labelTag: formatBytes(e.target.files[i].size),
                description: 'File type: ' + e.target.files[i].type,
                icon: 'file',
                id: i
            })
        }
        setUploadList(tempUploadList);
        setFileList(e.target.files);
    };

    function progressBarFactory(fileObject, fileUrl) {
        let localHistory = historyList;
        const id = localHistory.length;
        localHistory.push({
            id: id,
            percentage: 0,
            filename: fileObject.name,
            filetype: fileObject.type,
            filesize: formatBytes(fileObject.size),
            status: 'in-progress',
            fileUrl: fileUrl // Store the file URL here
        });
        setHistoryList(localHistory);
        return (progress) => {
            let tempHistory = historyList.slice();
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            tempHistory[id].percentage = percentage;
            if (percentage === 100) {
                tempHistory[id]['status'] = 'success';
            }
            setHistoryList(tempHistory);
        };
    }

    const handleUpload = () => {
        if (uploadList.length === 0) {
            setVisibleAlert(true);
        } else {
            console.log('Uploading files to S3');
            let i, progressBar = [], uploadCompleted = [];
            for (i = 0; i < uploadList.length; i++) {
                const id = uploadList[i].id;
                const fileName = fileList[id].name;

                Storage.put(fileName, fileList[id], {
                    level: "protected",
                    progressCallback: progressBarFactory(fileList[id], fileName)
                }).then(result => {
                    const s3Url = `https://${awsconfig.aws_user_files_s3_bucket}.s3.${awsconfig.aws_user_files_s3_bucket_region}.amazonaws.com/protected/${result.key}`;
                    console.log(`Completed the upload of ${result.key}`);
                    console.log(`File available at ${s3Url}`);

                    // Update historyList with the URL
                    setHistoryList(prevHistory => {
                        const updatedHistory = [...prevHistory];
                        const uploadIndex = updatedHistory.findIndex(historyItem => historyItem.filename === result.key);
                        if (uploadIndex >= 0) {
                            updatedHistory[uploadIndex].fileUrl = s3Url;
                        }
                        return updatedHistory;
                    });
                });
            }

            // Reset upload list after uploads are completed
            Promise.all(uploadCompleted)
                .then(() => setUploadList([]));
        }
    }

    const handleDismiss = (itemIndex) => {
        setUploadList([
            ...uploadList.slice(0, itemIndex),
            ...uploadList.slice(itemIndex + 1)
        ]);
    };

    const List = ({ list }) => (
        <>
            {list.map((item) => (
                <div key={item.id}>
                    <ProgressBar
                        status={item.status}
                        value={item.percentage}
                        variant="standalone"
                        additionalInfo={item.filesize}
                        description={item.filetype}
                        label={item.filename}
                    />
                    {item.status === 'success' && item.fileUrl && (
                        <Link external href={item.fileUrl}>
                            {item.fileUrl}
                        </Link>
                    )}
                </div>
            ))}
        </>
    );

    return (
        <ContentLayout
            header={
                <SpaceBetween size="m">
                    <Header
                        variant="h1"
                        info={<Link>Info</Link>}
                        description="Application to upload files to S3"
                    >
                        Application
                    </Header>
                </SpaceBetween>
            }
        >
            <SpaceBetween size="l">
                <Container
                    header={
                        <Header variant="h2">
                            Get Started Here!
                        </Header>
                    }
                >
                    {visibleAlert &&
                        <Alert
                            onDismiss={() => setVisibleAlert(false)}
                            dismissAriaLabel="Close alert"
                            dismissible
                            type="error"
                            header="No files selected"
                        >
                            You must select the files that you want to upload.
                        </Alert>
                    }

                    <FormField
                        label='Object Upload'
                        description='Click open, then select the files you want to upload from your computer'
                    />

                    <SpaceBetween direction="horizontal" size="xs">
                        <Button onClick={handleClick}
                            iconAlign="left"
                            iconName="upload"
                        >
                            Choose file[s]
                        </Button>
                        <input
                            type="file"
                            ref={hiddenFileInput}
                            onChange={handleChange}
                            style={{ display: 'none' }}
                            multiple
                        />
                        <Button variant="primary" onClick={handleUpload}>Upload</Button>
                    </SpaceBetween>

                    <TokenGroup
                        onDismiss={({ detail: { itemIndex } }) => {
                            handleDismiss(itemIndex)
                        }}
                        items={uploadList}
                        alignment="vertical"
                        limit={10}
                    />
                </Container>
                <Container
                    header={
                        <Header variant="h2">
                            History
                        </Header>
                    }
                >
                    <List list={historyList} />
                </Container>
            </SpaceBetween>
        </ContentLayout>
    );
};

function App() {
    const [navigationOpen, setNavigationOpen] = useState(false);
    const navbarItemClick = e => {
        console.log(e);
        if (e.detail.id === 'signout') {
            Auth.signOut().then(() => {
                window.location.reload();
            });
        }
    }

    return (
        <Authenticator>
            {({ signOut, user }) => (
                <>
                    <div id="navbar" style={{ fontSize: 'body-l !important', position: 'sticky', top: 0, zIndex: 1002 }}>
                        <TopNavigation
                            identity={{
                                href: "#",
                                title: "Berxi S3 File Upload Tool",
                                logo: {
                                    src:  "data:image/svg+xml;base64,//48AD8AeABtAGwAIAB2AGUAcgBzAGkAbwBuAD0AIgAxAC4AMAAiACAAZQBuAGMAbwBkAGkAbgBnAD0AIgB1AHQAZgAtADEANgAiAD8APgANAAoAPAAhAC0ALQAgAEcAZQBuAGUAcgBhAHQAbwByADoAIABBAGQAbwBiAGUAIABJAGwAbAB1AHMAdAByAGEAdABvAHIAIAAxADQALgAwAC4AMAAsACAAUwBWAEcAIABFAHgAcABvAHIAdAAgAFAAbAB1AGcALQBJAG4AIAAuACAAUwBWAEcAIABWAGUAcgBzAGkAbwBuADoAIAA2AC4AMAAwACAAQgB1AGkAbABkACAANAAzADMANgAzACkAIAAgAC0ALQA+AA0ACgA8ACEARABPAEMAVABZAFAARQAgAHMAdgBnACAAUABVAEIATABJAEMAIAAiAC0ALwAvAFcAMwBDAC8ALwBEAFQARAAgAFMAVgBHACAAMQAuADEALwAvAEUATgAiACAAIgBoAHQAdABwADoALwAvAHcAdwB3AC4AdwAzAC4AbwByAGcALwBHAHIAYQBwAGgAaQBjAHMALwBTAFYARwAvADEALgAxAC8ARABUAEQALwBzAHYAZwAxADEALgBkAHQAZAAiAD4ADQAKADwAcwB2AGcAIAB2AGUAcgBzAGkAbwBuAD0AIgAxAC4AMQAiACAAaQBkAD0AIgBMAGEAeQBlAHIAXwAxACIAIAB4AG0AbABuAHMAPQAiAGgAdAB0AHAAOgAvAC8AdwB3AHcALgB3ADMALgBvAHIAZwAvADIAMAAwADAALwBzAHYAZwAiACAAeABtAGwAbgBzADoAeABsAGkAbgBrAD0AIgBoAHQAdABwADoALwAvAHcAdwB3AC4AdwAzAC4AbwByAGcALwAxADkAOQA5AC8AeABsAGkAbgBrACIAIAB4AD0AIgAwAHAAeAAiACAAeQA9ACIAMABwAHgAIgANAAoACQAgAHcAaQBkAHQAaAA9ACIANwAwAHAAeAAiACAAaABlAGkAZwBoAHQAPQAiADcAMABwAHgAIgAgAHYAaQBlAHcAQgBvAHgAPQAiADAAIAAwACAANwAwACAANwAwACIAIABlAG4AYQBiAGwAZQAtAGIAYQBjAGsAZwByAG8AdQBuAGQAPQAiAG4AZQB3ACAAMAAgADAAIAA3ADAAIAA3ADAAIgAgAHgAbQBsADoAcwBwAGEAYwBlAD0AIgBwAHIAZQBzAGUAcgB2AGUAIgA+AA0ACgA8AGcAPgANAAoACQA8AGcAPgANAAoACQAJADwAZwA+AA0ACgAJAAkACQA8AGcAPgANAAoACQAJAAkACQA8AHAAYQB0AGgAIABmAGkAbABsAC0AcgB1AGwAZQA9ACIAZQB2AGUAbgBvAGQAZAAiACAAYwBsAGkAcAAtAHIAdQBsAGUAPQAiAGUAdgBlAG4AbwBkAGQAIgAgAGYAaQBsAGwAPQAiACMAMQA0ADYARQBCADQAIgAgAGQAPQAiAE0ANgAzAC4AOQA1ACwAMQA1AC4ANwA4ADYAYwAwACwANAAuADAAMAA2AC0AMQAyAC4AOQA2ADMALAA3AC4AMgAzADgALQAyADgALgA5ADQAOQAsADcALgAyADMAOAANAAoACQAJAAkACQAJAGMALQAxADUALgA5ADgAOAAsADAALQAyADgALgA5ADUAMQAtADMALgAyADMAMgAtADIAOAAuADkANQAxAC0ANwAuADIAMwA4AGwAOQAuADYANQAsADQAMwAuADgAMwA5AGMAMAAsADIALgA2ADcAMgAsADgALgA2ADMANwAsADQALgA4ADIANgAsADEAOQAuADMAMAAxACwANAAuADgAMgA2AGMAMQAwAC4ANgA2ADIALAAwACwAMQA5AC4AMgA5ADkALQAyAC4AMQA1ADQALAAxADkALgAyADkAOQAtADQALgA4ADIANgBsADAALAAwAA0ACgAJAAkACQAJAAkATAA2ADMALgA5ADUALAAxADUALgA3ADgANgB6ACIALwA+AA0ACgAJAAkACQA8AC8AZwA+AA0ACgAJAAkACQA8AGcAPgANAAoACQAJAAkACQA8AHAAYQB0AGgAIABmAGkAbABsAC0AcgB1AGwAZQA9ACIAZQB2AGUAbgBvAGQAZAAiACAAYwBsAGkAcAAtAHIAdQBsAGUAPQAiAGUAdgBlAG4AbwBkAGQAIgAgAGYAaQBsAGwAPQAiACMAMQA0ADYARQBCADQAIgAgAGQAPQAiAE0ANgAzAC4AOQA1ACwAMQAyAC4ANwA4ADYAYwAwAC0ANAAuADAAMAA0AC0AMQAyAC4AOQA2ADMALQA3AC4AMgAzADcALQAyADgALgA5ADQAOQAtADcALgAyADMANwANAAoACQAJAAkACQAJAGMALQAxADUALgA5ADgAOAAsADAALQAyADgALgA5ADUAMQAsADMALgAyADMAMwAtADIAOAAuADkANQAxACwANwAuADIAMwA3AGMAMAAsADQALgAwADAANgAsADEAMgAuADkANgAzACwANwAuADIAMwA4ACwAMgA4AC4AOQA1ADEALAA3AC4AMgAzADgAQwA1ADAALgA5ADgANwAsADIAMAAuADAAMgA0ACwANgAzAC4AOQA1ACwAMQA2AC4ANwA5ADIALAA2ADMALgA5ADUALAAxADIALgA3ADgANgBMADYAMwAuADkANQAsADEAMgAuADcAOAA2AA0ACgAJAAkACQAJAAkAegAiAC8APgANAAoACQAJAAkAPAAvAGcAPgANAAoACQAJADwALwBnAD4ADQAKAAkAPAAvAGcAPgANAAoAPAAvAGcAPgANAAoAPAAvAHMAdgBnAD4ADQAKAA==",
                                    alt: "Berxi S3 File Upload Tool"
                            }}
                          }  utilities={[
                                {
                                    type: "button",
                                    text: "Access Uploaded Content",
                                    href: "https://us-east-1.console.aws.amazon.com/s3/buckets/berxuploadedcbe21-dev?region=us-east-1&bucketType=general&tab=objects/",
                                    external: true,
                                    externalIconAriaLabel: " (opens in a new tab)"
                                },
                                {
                                    type: "menu-dropdown",
                                    text: user.username,
                                    description: user.username,
                                    iconName: "user-profile",
                                    onItemClick: navbarItemClick,
                                    items: [
                                        { id: "signout", text: "Sign out" }
                                    ]
                                }
                            ]}
                            i18nStrings={{
                                searchIconAriaLabel: "Search",
                                searchDismissIconAriaLabel: "Close search",
                                overflowMenuTriggerText: "More"
                            }}
                        />
                    </div>
                    <AppLayout
                        content={<Content />}
                        headerSelector='#navbar'
                        navigation={<ServiceNavigation />}
                        navigationOpen={navigationOpen}
                        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
                        ariaLabels={appLayoutLabels}
                    />
                </>
            )}
        </Authenticator>
    );
}export default App;


